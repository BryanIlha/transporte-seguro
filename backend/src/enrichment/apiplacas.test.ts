import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isValidPlate,
  mapSnapshot,
  normalizePlate,
  queryApiPlacas,
  redactPayload,
} from "./apiplacas.js";

describe("integração da consulta APIPlacas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.APIPLACAS_TOKEN;
  });

  it("normaliza placas antigas e Mercosul", () => {
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
    expect(normalizePlate("abc1d23")).toBe("ABC1D23");
    expect(isValidPlate("abc-1234")).toBe(true);
    expect(isValidPlate("abc-12")).toBe(false);
  });

  it("mapeia o snapshot sem expor o payload bruto", () => {
    expect(
      mapSnapshot({
        MARCA: "Volkswagen",
        MODELO: "Comil",
        marcaModelo: "Volkswagen Comil",
        ano: "2022",
        anoModelo: "2023",
        cor: "Branca",
        situacao: "Regular",
        extra: { uf_placa: "SP", nacionalidade: "Nacional" },
        token: "secret",
      }),
    ).toMatchObject({
      brand: "Volkswagen",
      model: "Comil",
      makeModel: "Volkswagen Comil",
      state: "SP",
      origin: "Nacional",
    });
    expect(redactPayload({ token: "secret", nested: "secret-value" }, "secret")).toEqual({
      nested: "[redacted]-value",
    });
  });

  it("consulta o provedor e redige o token", async () => {
    process.env.APIPLACAS_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          marca: "Mercedes-Benz",
          modelo: "Sprinter",
          ano: "2020",
          token: "test-token",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await queryApiPlacas("ABC1D23");
    expect(result.status).toBe("SUCCESS");
    expect(result.snapshot?.brand).toBe("Mercedes-Benz");
    expect(result.rawPayload).toEqual({ marca: "Mercedes-Benz", modelo: "Sprinter", ano: "2020" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://wdapi2.com.br/consulta/ABC1D23/test-token",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
