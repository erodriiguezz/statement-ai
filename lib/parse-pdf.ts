import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Transaction } from "@/lib/types";

const PARSER_SCRIPT = join(process.cwd(), "parser", "parse_statement.py");

function resolvePythonCommand(): string {
  return process.env.PYTHON_PATH || "python3";
}

export async function parsePdfBuffer(
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
