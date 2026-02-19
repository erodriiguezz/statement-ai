// import * as pdfjsLib from "pdfjs-dist";

// export async function extractTextFromPDF(buffer: Buffer) {
//   const uint8Array = new Uint8Array(buffer);

//   // Disable worker for serverless
//   (pdfjsLib as any).GlobalWorkerOptions.workerSrc = undefined;

//   const pdf = await pdfjsLib.getDocument({
//     data: uint8Array,
//     useSystemFonts: true,
//     isEvalSupported: false,
//   }).promise;

//   let text = "";

//   for (let i = 1; i <= pdf.numPages; i++) {
//     const page = await pdf.getPage(i);
//     const content = await page.getTextContent();

//     const strings = content.items.map((item: any) => item.str);
//     text += strings.join(" ") + "\n";
//   }

//   return text;
// }

// export async function extractTextFromPDF(buffer: Buffer) {
//   // ⭐ prevents Next from bundling pdfjs
//   const pdfjsLib = await (eval(
//     'import("pdfjs-dist/legacy/build/pdf.js")',
//   ) as Promise<any>);

//   const data = new Uint8Array(buffer);

//   const loadingTask = pdfjsLib.getDocument({
//     data,
//     disableWorker: true, // critical
//     useSystemFonts: true,
//   });

//   const pdf = await loadingTask.promise;

//   let rows: string[] = [];

//   for (let i = 1; i <= pdf.numPages; i++) {
//     const page = await pdf.getPage(i);
//     const content = await page.getTextContent();

//     rows.push(...content.items.map((item: any) => item.str));
//   }

//   return rows;
// }

export async function extractTextFromPDF(buffer: Buffer) {
  // Prevent Next.js bundling issues (critical for Vercel)
  const pdfjsLib = await (eval(
    'import("pdfjs-dist/legacy/build/pdf.js")',
  ) as Promise<any>);

  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    disableWorker: true, // server environment
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;

  let rows: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    rows.push(...content.items.map((item: any) => item.str).filter(Boolean));
  }

  return rows;
}
