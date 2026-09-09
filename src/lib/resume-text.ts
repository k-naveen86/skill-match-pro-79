// Browser-side resume text extraction (PDF + DOCX + TXT).
// Runs in the browser so the server only ever receives plain text.

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      text += "\n";
    }
    return text.replace(/\s+\n/g, "\n").trim();
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser.js");
    const buffer = await file.arrayBuffer();
    const result = await (
      mammoth as unknown as {
        extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
      }
    ).extractRawText({ arrayBuffer: buffer });
    return result.value.trim();
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return (await file.text()).trim();
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX or TXT resume.");
}
