import { parentPort, workerData } from "node:worker_threads";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const task = getDocument({
  data: new Uint8Array(workerData),
  isEvalSupported: false,
  disableFontFace: true,
  useSystemFonts: false,
});
try {
  const document = await task.promise;
  if (document.numPages > 5) throw new Error("PAGE_LIMIT");
  const pages = [];
  let count = 0;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .filter((item) => typeof item.str === "string")
      .map((item) => ({ str: item.str, transform: item.transform, width: item.width }));
    count += items.length;
    if (count > 20000) throw new Error("TEXT_LIMIT");
    pages.push(items);
    page.cleanup();
  }
  parentPort.postMessage({ ok: true, pages });
} catch (error) {
  const code =
    error.name === "PasswordException"
      ? "PASSWORD"
      : /PAGE_LIMIT|TEXT_LIMIT/.test(error.message)
        ? "LIMIT"
        : error.name === "InvalidPDFException"
          ? "INVALID"
          : "UNREADABLE";
  parentPort.postMessage({ ok: false, code });
} finally {
  await task.destroy();
}
