import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdfReader";
import { parseTransactions } from "@/lib/transactionParser";
import { generateScheduleC } from "@/lib/ai";
import { packageForAI, Transaction } from "@/lib/aiPackager";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("pdfs") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No PDFs uploaded" }, { status: 400 });
    }

    let allTransactions = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const rows = await extractTextFromPDF(buffer);

      const transactions = parseTransactions(rows);

      allTransactions.push(...transactions);
    }

    // Only expenses for Schedule C
    const expenseTransactions = allTransactions.filter(
      (t) => t.type === "debit",
    );

    const packaged = packageForAI(expenseTransactions);

    return NextResponse.json({
      transactionCount: allTransactions.length,
      expenseCount: expenseTransactions.length,
      packaged,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
