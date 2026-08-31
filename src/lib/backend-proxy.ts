type BackendEnvironment = {
  BACKEND_INTERNAL_URL?: string;
  BACKEND_DEV_URL?: string;
};

export function resolveBackendUrl(env: BackendEnvironment, development: boolean) {
  return (
    env.BACKEND_INTERNAL_URL ||
    (development ? env.BACKEND_DEV_URL || "http://127.0.0.1:3001" : undefined)
  );
}

export async function proxyBackendRequest(request: Request, backendUrl: string | undefined) {
  const unavailable = () =>
    Response.json(
      { error: "Serviço temporariamente indisponível. Tente novamente em instantes." },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "30" } },
    );

  if (!backendUrl) return unavailable();

  try {
    const requestUrl = new URL(request.url);
    // Assign pathname separately so a path beginning with // cannot change the upstream host.
    const target = new URL(backendUrl);
    target.pathname = requestUrl.pathname.slice("/api".length);
    target.search = requestUrl.search;
    const headers = new Headers(request.headers);
    headers.delete("host");
    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
      signal: request.signal,
      duplex: "half",
    };
    return await fetch(target, init);
  } catch {
    return unavailable();
  }
}
