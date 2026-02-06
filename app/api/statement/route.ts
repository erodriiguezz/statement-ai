import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf/extractText";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await extractPdfText(file);

    return NextResponse.json({
      success: true,
      length: text.length,
      preview: text.slice(0, 500),
    });
  } catch (err: any) {
    console.error("STATEMENT PARSER ERROR:", err);
    return NextResponse.json(
      { error: "Internal parser error", message: err.message },
      { status: 500 },
    );
  }
}
