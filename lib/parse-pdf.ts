import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Transaction } from "@/lib/types";

const PARSER_SCRIPT = join(process.cwd(), "parser", "parse_statement.py");

function resolvePythonCommand(): string {
  return process.env.PYTHON_PATH || "python3";
}

function resolveParserServiceUrl(): string | null {
  const raw = process.env.PARSER_SERVICE_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}

export async function parsePdfBuffer(
  buffer: Buffer,
  filename: string,
): Promise<Transaction[]> {
  const serviceUrl = resolveParserServiceUrl();
  if (serviceUrl) {
    return parsePdfViaRemoteService(buffer, filename, serviceUrl);
  }
  return parsePdfViaLocalPython(buffer, filename);
}

async function parsePdfViaRemoteService(
  buffer: Buffer,
  filename: string,
  serviceUrl: string,
): Promise<Transaction[]> {
  // Free Render instances sleep after ~15m idle; wake before uploading the PDF.
  await wakeParserService(serviceUrl);

  const headers: HeadersInit = {};
  const apiKey = process.env.PARSER_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let lastError = "Parser service unavailable.";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/pdf",
    });
    form.append("file", blob, filename.replace(/[^\w.-]/g, "_"));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch(`${serviceUrl}/parse`, {
        method: "POST",
        headers,
        body: form,
        signal: controller.signal,
      });

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        lastError = `Parser service warming up (${response.status}). Retrying…`;
        if (attempt < 3) {
          await sleep(attempt * 4000);
          continue;
        }
        throw new Error(
          "Parser service returned 502/503 after retries. Render free tier may still be starting — wait ~60s and try again.",
        );
      }

      const payload = (await response.json().catch(() => ({}))) as {
        transactions?: Transaction[];
        detail?: string | Array<{ msg?: string }>;
        error?: string;
      };

      if (!response.ok) {
        const detail =
          typeof payload.detail === "string"
            ? payload.detail
            : Array.isArray(payload.detail)
              ? payload.detail
                  .map((item) => item.msg)
                  .filter(Boolean)
                  .join("; ")
              : payload.error;
        throw new Error(
          detail ||
            `Parser service error (${response.status}). Check PARSER_SERVICE_URL on Vercel and Render logs.`,
        );
      }

      return payload.transactions ?? [];
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Parser service timed out after 120s.");
      }
      if (
        error instanceof Error &&
        /warming up|502|503|504|fetch failed|ECONNRESET/i.test(error.message) &&
        attempt < 3
      ) {
        lastError = error.message;
        await sleep(attempt * 4000);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(lastError);
}

async function wakeParserService(serviceUrl: string): Promise<void> {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${serviceUrl}/health`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore — cold start / connection reset is expected on free tier.
    } finally {
      clearTimeout(timeout);
    }
    await sleep(Math.min(10_000, attempt * 2500));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function parsePdfViaLocalPython(
  buffer: Buffer,
  filename: string,
): Promise<Transaction[]> {
  const tempDir = await mkdtemp(join(tmpdir(), "statement-ai-"));
  const pdfPath = join(tempDir, filename.replace(/[^\w.-]/g, "_"));

  try {
    await writeFile(pdfPath, buffer);

    const stdout = await runPythonParser(pdfPath);
    const parsed = JSON.parse(stdout) as {
      transactions?: Transaction[];
      error?: string;
    };

    if (parsed.error) {
      throw new Error(parsed.error);
    }

    return parsed.transactions ?? [];
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function runPythonParser(pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolvePythonCommand(), [PARSER_SCRIPT, pdfPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to start Python parser. Install dependencies with: pip install -r parser/requirements.txt (${error.message})`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              "PDF parsing failed. Ensure Python 3 and pdfplumber are installed.",
          ),
        );
        return;
      }

      resolve(stdout.trim());
    });
  });
}

export async function parsePdfFiles(files: File[]): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const transactions = await parsePdfBuffer(buffer, file.name);
    allTransactions.push(...transactions);
  }

  return allTransactions.sort((a, b) => a.date.localeCompare(b.date));
}

export async function readPdfFromPath(pdfPath: string): Promise<Transaction[]> {
  const buffer = await readFile(pdfPath);
  const filename = pdfPath.split("/").pop() ?? "statement.pdf";
  return parsePdfBuffer(buffer, filename);
}
