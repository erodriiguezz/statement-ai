import { NextResponse } from "next/server";

import { parsePdfFiles } from "@/lib/parse-pdf";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Diagnostics: confirms Vercel env + whether Render /health is reachable. */
export async function GET() {
  const serviceUrl = process.env.PARSER_SERVICE_URL?.trim().replace(/\/$/, "") || null;
  const hasApiKey = Boolean(process.env.PARSER_API_KEY?.trim());

  if (!serviceUrl) {
    return NextResponse.json({
      ok: false,
      mode: "local",
      parserServiceUrl: null,
      hasApiKey,
      error:
        "PARSER_SERVICE_URL is not set on Vercel. Set it to your Render URL and redeploy.",
    });
  }

  let healthStatus: number | null = null;
  let healthBody: unknown = null;
  let healthError: string | null = null;
  try {
    const response = await fetch(`${serviceUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    healthStatus = response.status;
    healthBody = await response.json().catch(async () => response.text());
  } catch (error) {
    healthError = error instanceof Error ? error.message : "health check failed";
  }

  return NextResponse.json({
    ok: healthStatus === 200 && hasApiKey,
    mode: "remote",
    parserServiceUrl: serviceUrl,
    hasApiKey,
    healthStatus,
    healthBody,
    healthError,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => {
      return entry instanceof File && entry.size > 0;
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Upload at least one PDF bank statement." },
        { status: 400 },
      );
    }

    const invalidFiles = files.filter(
      (file) => !file.name.toLowerCase().endsWith(".pdf"),
    );
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: "Only PDF bank statements are supported." },
        { status: 400 },
      );
    }

    const transactions = await parsePdfFiles(files);

    if (transactions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No transactions were found in the uploaded statements. Try a different PDF export from your bank.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse PDF statements.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
