import { NextResponse } from "next/server";

import { generateAnalysis } from "@/lib/analyze";
import type { Transaction } from "@/lib/types";

export const runtime = "nodejs";

interface AnalyzeRequestBody {
  transactions?: unknown;
  businessName?: unknown;
}

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const tx = value as Record<string, unknown>;
  return (
    typeof tx.id === "string" &&
    tx.id.length > 0 &&
    typeof tx.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(tx.date) &&
    typeof tx.description === "string" &&
    typeof tx.amount === "number" &&
    Number.isFinite(tx.amount)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;

    if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one verified transaction." },
        { status: 400 },
      );
    }

    if (!body.transactions.every(isTransaction)) {
      return NextResponse.json(
        {
          error:
            "Each transaction must include id, date (YYYY-MM-DD), description, and numeric amount.",
        },
        { status: 400 },
      );
    }

    if (body.transactions.length > 2000) {
      return NextResponse.json(
        { error: "Too many transactions (max 2000). Split into smaller batches." },
        { status: 400 },
      );
    }

    const businessName =
      typeof body.businessName === "string" ? body.businessName.trim() : undefined;

    const results = await generateAnalysis(body.transactions, businessName);

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
