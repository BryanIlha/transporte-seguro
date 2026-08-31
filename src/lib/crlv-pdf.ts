import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { parseCrlvText, type CrlvParseResult } from "@/lib/crlv-parser";
import { layoutTextFromItems, simpleTextFromItems, type TextItemLike } from "./pdf-text-layout";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type PdfPageLike = {
  getTextContent: () => Promise<{ items: TextItemLike[] }>;
  cleanup: () => void;
};

export async function extractPdfText(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const document = await loadingTask.promise;
  const pageCount = document.numPages;
  const layoutPages: string[] = [];
  const simplePages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = (await document.getPage(pageNumber)) as unknown as PdfPageLike;
      const content = await page.getTextContent();
      layoutPages.push(layoutTextFromItems(content.items));
      simplePages.push(simpleTextFromItems(content.items));
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  return {
    texto_layout: layoutPages.join("\n"),
    texto_extraido: simplePages.join("\n"),
    paginas: pageCount,
  };
}

export async function extractCrlvPdf(file: File): Promise<CrlvParseResult> {
  const extracted = await extractPdfText(file);
  return parseCrlvText(extracted.texto_layout, extracted.texto_extraido, extracted.paginas);
}
