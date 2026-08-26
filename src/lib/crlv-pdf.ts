import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { parseCrlvText, type CrlvParseResult } from "@/lib/crlv-parser";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type TextItemLike = {
  str?: string;
  transform?: number[];
  width?: number;
};

type PdfPageLike = {
  getTextContent: () => Promise<{ items: TextItemLike[] }>;
  cleanup: () => void;
};

function layoutTextFromItems(items: TextItemLike[]) {
  const positioned = items
    .filter((item) => item.str?.trim() && item.transform?.length)
    .map((item) => ({
      text: item.str?.trim() ?? "",
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      width: item.width ?? 0,
    }));

  const lines: Array<{ y: number; items: typeof positioned }> = [];
  for (const item of positioned) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) => {
      const ordered = line.items.sort((left, right) => left.x - right.x);
      let previousEnd = 0;
      return ordered
        .map((item, index) => {
          const gap = index === 0 ? 0 : item.x - previousEnd;
          const spaces = gap > 2 ? " ".repeat(Math.min(32, Math.max(1, Math.round(gap / 4)))) : "";
          previousEnd = item.x + item.width;
          return `${spaces}${item.text}`;
        })
        .join("")
        .trimEnd();
    })
    .join("\n");
}

function simpleTextFromItems(items: TextItemLike[]) {
  return items
    .filter((item) => item.str?.trim())
    .map((item) => item.str?.trim())
    .filter(Boolean)
    .join(" ");
}

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
