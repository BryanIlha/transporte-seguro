import { expect, it, vi } from "vitest";
import type { Database } from "../db/client.js";

it("não permite leitura de CRLV sem sessão autenticada", async () => {
  vi.stubEnv("SESSION_SECRET", "isolated-test-secret-not-used-outside-tests");
  const { buildApp } = await import("../app.js");
  const app = buildApp({ db: {} as Database });
  try {
    const response = await app.inject({ method: "POST", url: "/v1/admin/documents/crlv/extract" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Não autenticado." });
  } finally {
    await app.close();
    vi.unstubAllEnvs();
  }
});
