// Run directly from Coolify's container healthcheck, without curl or shell operators.
try {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? "3001"}/health`, {
    signal: AbortSignal.timeout(4000),
  });
  const result = (await response.json()) as { status?: string; project?: string } | null;
  process.exit(
    response.ok && result?.status === "ok" && result?.project === "transporte-seguro" ? 0 : 1,
  );
} catch {
  process.exit(1);
}
import process from "node:process";
