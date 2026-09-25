import PDFDocument from "pdfkit";

// Every report PDF in this codebase is generated the same way: build synchronously against an
// in-memory PDFDocument, collect its output chunks, resolve once the stream ends. Kept as one
// helper so every report-PDF route buffers/streams identically instead of re-deriving this.
export function renderPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

export function pdfHeading(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
  doc.fontSize(18).fillColor("#000").text(title);
  if (subtitle) doc.fontSize(10).fillColor("#555").text(subtitle);
  doc.moveDown(1.2);
  doc.fillColor("#000");
}

export function pdfSection(doc: PDFKit.PDFDocument, title: string, body: string): void {
  doc.fontSize(13).text(title);
  doc.moveDown(0.3);
  doc.fontSize(11).text(body || "—");
  doc.moveDown(1);
}
