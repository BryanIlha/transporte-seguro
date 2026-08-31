import { describe, expect, it } from "vitest";
import { crlvReadError } from "./crlv-errors";

describe("recuperação de erros do CRLV", () => {
  it("oferece recuperação para uma função ausente sem expor código minificado", () => {
    const message = crlvReadError(
      new TypeError("undefined is not a function (near '...e of t...')"),
    );
    expect(message).toContain("preencha os dados manualmente");
    expect(message).not.toContain("undefined");
  });
  it("orienta baixar novamente um PDF incompleto", () => {
    expect(crlvReadError(new Error("Invalid PDF structure."))).toContain("Baixe o CRLV novamente");
  });
  it("identifica proteção por senha", () => {
    expect(crlvReadError(new Error("No password given"))).toContain("cópia sem senha");
  });
  it("não exibe detalhes de erros desconhecidos", () => {
    expect(crlvReadError({ internal: "sensitive diagnostic" })).not.toContain("sensitive");
  });
});
