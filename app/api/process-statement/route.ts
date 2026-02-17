import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdfReader";
import { parseTransactions } from "@/lib/transactionParser";
import { generateScheduleC } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1️⃣ Extract rows from PDF
    const rows = await extractTextFromPDF(buffer);

    // 2️⃣ Convert to transactions
    const transactions = parseTransactions(rows);

    // 3️⃣ Send to AI
    const scheduleC = await generateScheduleC(transactions);

    return NextResponse.json({
      rows,
      transactions,
      scheduleC,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
