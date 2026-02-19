export async function extractTextFromPDF(buffer: Buffer) {
  // 1. Import the main library AND the worker explicitly
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.js");

  // 2. Map the worker so the library doesn't try to "find" it on the disk
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    disableWorker: true, // Still keep this for Serverless
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;

  // ... rest of your loop logic
  let rows: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).filter(Boolean);
    rows.push(...pageText);
  }

  return rows;
}
