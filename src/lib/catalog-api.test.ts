import { afterEach, describe, expect, it, vi } from "vitest";
import { getCatalogVehicles, mapAdminSession, uploadCrlv } from "./catalog-api";
import { parseCrlvText } from "./crlv-parser";

afterEach(() => vi.unstubAllGlobals());

describe("envio do CRLV conferido", () => {
  it("preserva a extração para auditoria e envia os valores do formulário como confirmados", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ document: {} })));
    vi.stubGlobal("fetch", fetchMock);
    const result = parseCrlvText("", "", 1);
    result.data.marca_modelo_versao = "MARCA/MODELO ORIGINAL";
    result.data.ano_fabricacao = 2006;
    result.data.lotacao_pessoas = 39;

    await uploadCrlv(
      "vehicle-test",
      new File(["%PDF-test"], "teste.pdf", { type: "application/pdf" }),
      result,
      "a".repeat(64),
      {
        plate: "ABC1D23",
        renavam: "00000000001",
        chassi: "9BWZZZ377VT000001",
        model: "Modelo conferido",
        manufacturedYear: "2007",
        passengerCapacity: "38",
      },
      "PRONTO",
      null,
    );

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(JSON.parse(String(body.get("metadata")))).toMatchObject({
      marca_modelo_versao: "MARCA/MODELO ORIGINAL",
      ano_fabricacao: 2006,
      lotacao_pessoas: 39,
    });
    expect(JSON.parse(String(body.get("confirmedData")))).toMatchObject({
      marca_modelo_versao: "Modelo conferido",
      ano_fabricacao: 2007,
      lotacao_pessoas: 38,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/admin/vehicles/vehicle-test/documents/crlv");
  });
});

describe("carregamento do catálogo público", () => {
  it("distingue indisponibilidade da API de catálogo vazio", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Catálogo indisponível" }), { status: 503 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ vehicles: [] })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCatalogVehicles()).rejects.toThrow("Catálogo indisponível");
    await expect(getCatalogVehicles()).resolves.toEqual([]);
  });

  it("permite cancelar a requisição ao sair da página ou exceder o prazo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    const controller = new AbortController();
    const request = getCatalogVehicles(controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("contrato de sessão do administrador", () => {
  it("adapta a resposta admin da API para o formato usado pelo painel", () => {
    expect(mapAdminSession({ admin: { id: "admin-id", email: "infra@hawksbi.com.br" } })).toEqual({
      user: { id: "admin-id", email: "infra@hawksbi.com.br" },
    });
  });
});
