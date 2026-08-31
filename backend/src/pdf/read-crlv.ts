import { Worker } from "node:worker_threads";

export type PdfTextItem = { str: string; transform: number[]; width: number };
const messages: Record<string, string> = {
  PASSWORD: "Este PDF está protegido por senha. Envie uma cópia sem senha.",
  INVALID: "O PDF está incompleto ou inválido. Baixe o CRLV novamente e tente a nova cópia.",
  LIMIT: "Envie apenas o CRLV, com no máximo 5 páginas.",
  TIMEOUT: "A leitura demorou mais que o esperado. Tente novamente com o PDF original do CRLV.",
  BUSY: "Há outras leituras em andamento. Aguarde alguns segundos e tente novamente.",
  UNREADABLE:
    "Não foi possível extrair o texto deste PDF. Envie o CRLV digital original ou preencha os dados manualmente.",
};
export class CrlvReadError extends Error {
  constructor(public code: string) {
    super(messages[code] ?? messages.UNREADABLE);
  }
}
let activeReaders = 0;

// A separate worker can be terminated; malformed PDFs cannot block the API event loop.
export async function readCrlvPages(buffer: Buffer): Promise<PdfTextItem[][]> {
  if (activeReaders >= 2) throw new CrlvReadError("BUSY");
  activeReaders++;
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    worker = new Worker(new URL("./crlv-worker.mjs", import.meta.url), {
      workerData: buffer,
      execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new CrlvReadError("TIMEOUT")), 15000);
      worker!.once("message", (message) =>
        message.ok ? resolve(message.pages) : reject(new CrlvReadError(message.code)),
      );
      worker!.once("error", () => reject(new CrlvReadError("UNREADABLE")));
      worker!.once("exit", () => reject(new CrlvReadError("UNREADABLE")));
    });
  } finally {
    clearTimeout(timer);
    await worker?.terminate();
    activeReaders--;
  }
}
