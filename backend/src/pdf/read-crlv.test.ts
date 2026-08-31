import { describe, expect, it } from "vitest";
import { readCrlvPages } from "./read-crlv.js";

function pdf(pageCount = 1) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, i) => `${5 + i} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const content = "BT /F1 12 Tf 40 700 Td (PLACA ABC1D23) Tj ET";
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  for (let i = 0; i < pageCount; i++)
    objects.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>",
    );
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}

describe("leitura privada do CRLV em worker", () => {
  it("extrai texto e coordenadas de um PDF real sem navegador", async () => {
    const pages = await readCrlvPages(pdf());
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ str: "PLACA ABC1D23", transform: expect.any(Array) }),
      ]),
    );
  });
  it("recusa PDF inválido com erro controlado", async () => {
    await expect(readCrlvPages(Buffer.from("%PDF-1.7\ninvalid"))).rejects.toMatchObject({
      code: "INVALID",
    });
  });
  it("limita páginas antes de extrair conteúdo", async () => {
    await expect(readCrlvPages(pdf(6))).rejects.toMatchObject({ code: "LIMIT" });
  });
  it("limita leitores simultâneos e libera capacidade ao terminar", async () => {
    const first = readCrlvPages(pdf());
    const second = readCrlvPages(pdf());
    await expect(readCrlvPages(pdf())).rejects.toMatchObject({ code: "BUSY" });
    await Promise.all([first, second]);
    await expect(readCrlvPages(pdf())).resolves.toHaveLength(1);
  });
});
