export async function extractTextFromPDF(buffer: Buffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.js");

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    disableWorker: true,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;

  let rows: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).filter(Boolean);
    rows.push(...pageText);
  }

  return rows;
}
