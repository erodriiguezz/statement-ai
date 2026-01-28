import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/esm/pdf";
import pdfWorker from "pdfjs-dist/esm/pdf.worker.entry";

GlobalWorkerOptions.workerSrc = pdfWorker;

export default async function extractText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;

  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent({ normalizeWhitespace: true });
    pages.push(content.items.map((item) => item.str).join(" "));
  }

  return pages;
}
