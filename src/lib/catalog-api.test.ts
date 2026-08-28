import { describe, expect, it } from "vitest";
import { mapAdminSession } from "./catalog-api";

describe("contrato de sessão do administrador", () => {
  it("adapta a resposta admin da API para o formato usado pelo painel", () => {
    expect(mapAdminSession({ admin: { id: "admin-id", email: "infra@hawksbi.com.br" } })).toEqual({
      user: { id: "admin-id", email: "infra@hawksbi.com.br" },
    });
  });
});
