import { afterEach, describe, expect, it, vi } from "vitest";
import { getCatalogVehicles, mapAdminSession } from "./catalog-api";

afterEach(() => vi.unstubAllGlobals());

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
