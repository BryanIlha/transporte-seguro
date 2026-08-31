import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyBackendRequest, resolveBackendUrl } from "./backend-proxy";

afterEach(() => vi.unstubAllGlobals());

describe("backend routing", () => {
  it("uses the local API only in development and preserves explicit configuration", () => {
    expect(resolveBackendUrl({}, true)).toBe("http://127.0.0.1:3001");
    expect(resolveBackendUrl({}, false)).toBeUndefined();
    expect(resolveBackendUrl({ BACKEND_DEV_URL: "http://localhost:3007" }, true)).toBe(
      "http://localhost:3007",
    );
    expect(resolveBackendUrl({ BACKEND_INTERNAL_URL: "http://api:3001" }, true)).toBe(
      "http://api:3001",
    );
  });

  it("returns a non-cacheable API error, not an HTML page or empty stock, when unconfigured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await proxyBackendRequest(
      new Request("http://web/api/catalog/vehicles"),
      undefined,
    );
    expect(result.status).toBe(503);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.json()).toHaveProperty("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the configured host even for double-slash request paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);
    await proxyBackendRequest(
      new Request("http://web/api//other.example/vehicles?mode=rent"),
      "http://api:3001",
    );
    const target = fetchMock.mock.calls[0][0] as URL;
    expect(target.origin).toBe("http://api:3001");
    expect(target.pathname).toBe("//other.example/vehicles");
    expect(target.search).toBe("?mode=rent");
  });

  it("forwards authenticated writes and leaves upstream responses intact", async () => {
    const upstream = new Response(null, { status: 204 });
    const fetchMock = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("http://web/api/admin/vehicles/123", {
      method: "PATCH",
      headers: { cookie: "session=test", host: "web" },
      body: "{}",
    });
    expect(await proxyBackendRequest(request, "http://api:3001")).toBe(upstream);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(request.body);
    expect((init.headers as Headers).get("cookie")).toBe("session=test");
    expect((init.headers as Headers).has("host")).toBe(false);
    expect(init.redirect).toBe("manual");
  });

  it("returns 503 when the API is offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    const result = await proxyBackendRequest(
      new Request("http://web/api/catalog/vehicles"),
      "http://api:3001",
    );
    expect(result.status).toBe(503);
    expect(await result.json()).toHaveProperty("error");
  });
});
