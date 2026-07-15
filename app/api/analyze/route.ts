import { NextResponse } from "next/server";

import { generateAnalysis } from "@/lib/analyze";
import type { Transaction } from "@/lib/types";

export const runtime = "nodejs";

interface AnalyzeRequestBody {
  transactions: Transaction[];
  businessName?: string;
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

    const results = await generateAnalysis(
      body.transactions,
      body.businessName,
    );

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
