// Browser-only PDF text extraction. Import lazily from event handlers.

export async function extractPdfText(data: ArrayBuffer, maxPages = 40): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages = Math.min(doc.numPages, maxPages);
  const chunks: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => (typeof item === "object" && item && "str" in item ? String(item.str) : ""))
      .join(" ");
    chunks.push(text);
  }
  return chunks.join("\n\n").replace(/[ \t]{2,}/g, " ").trim();
}
