export async function extractPdfText(file: File): Promise<string> {
  // IMPORTANT: lazy-load at runtime
  const pdfParse = require("pdf-parse");

  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdfParse(buffer);

  return data?.text ?? "";
}
