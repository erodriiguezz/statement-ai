export async function extractTextFromPDF(buffer: Buffer) {
  // ⭐ prevents Next from bundling pdfjs
  const pdfjsLib = await (eval(
    'import("pdfjs-dist/legacy/build/pdf.js")',
  ) as Promise<any>);

  const data = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: true, // critical
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;

  let rows: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    rows.push(...content.items.map((item: any) => item.str));
  }

  return rows;
}
