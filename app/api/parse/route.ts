import { NextResponse } from "next/server";

import { parsePdfFiles } from "@/lib/parse-pdf";

export const runtime = "nodejs";
export const maxDuration = 120;

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
