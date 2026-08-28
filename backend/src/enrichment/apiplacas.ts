export const apiPlacasStatuses = [
  "SUCCESS",
  "INVALID_PLATE",
  "NOT_FOUND",
  "TOKEN_INVALID",
  "QUOTA_EXCEEDED",
  "ERROR",
] as const;

export type ApiPlacasStatus = (typeof apiPlacasStatuses)[number];

export type ApiPlacasSnapshot = {
  brand: string | null;
  model: string | null;
  makeModel: string | null;
  year: string | null;
  modelYear: string | null;
  color: string | null;
  situation: string | null;
  state: string | null;
  origin: string | null;
  logoUrl: string | null;
};

export type ApiPlacasResult = {
  status: ApiPlacasStatus;
  plate: string | null;
  cacheHit: boolean;
  providerHttpStatus: number | null;
  message: string | null;
  snapshot: ApiPlacasSnapshot | null;
  checkedAt: string | null;
  applied: boolean;
};

const PLATE_PATTERN = /^[A-Z]{3}(?:\d[A-Z]\d{2}|\d{4})$/;
const SECRET_KEY_PATTERN = /(token|authorization|api[_-]?key|secret)/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function normalizePlate(value: unknown) {
  const normalized = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
  return normalized || null;
}

export function isValidPlate(value: unknown) {
  const normalized = normalizePlate(value);
  return Boolean(normalized && PLATE_PATTERN.test(normalized));
}

export function mapSnapshot(payload: unknown): ApiPlacasSnapshot {
  const row = asRecord(payload);
  const extra = asRecord(row.extra);
  return {
    brand: text(row.marca ?? row.MARCA),
    model: text(row.modelo ?? row.MODELO),
    makeModel: text(row.marcaModelo ?? row.marca_modelo),
    year: text(row.ano),
    modelYear: text(row.anoModelo ?? row.ano_modelo),
    color: text(row.cor),
    situation: text(row.situacao),
    state: text(row.uf ?? extra.uf_placa ?? extra.uf),
    origin: text(row.origem ?? extra.nacionalidade),
    logoUrl: text(row.logo ?? row.logo_url),
  };
}

export function providerMessage(payload: unknown) {
  const row = asRecord(payload);
  return text(row.message ?? row.mensagemRetorno);
}

export function redactPayload(value: unknown, secret = ""): unknown {
  if (Array.isArray(value)) return value.map((item) => redactPayload(item, secret));
  if (value && typeof value === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (!SECRET_KEY_PATTERN.test(key)) redacted[key] = redactPayload(child, secret);
    }
    return redacted;
  }
  if (typeof value === "string" && secret && value.includes(secret)) {
    return value.split(secret).join("[redacted]");
  }
  return value;
}

export async function queryApiPlacas(plateInput: string): Promise<{
  status: ApiPlacasStatus;
  plate: string;
  providerHttpStatus: number | null;
  message: string | null;
  snapshot: ApiPlacasSnapshot | null;
  rawPayload: unknown;
  checkedAt: string;
}> {
  const plate = normalizePlate(plateInput);
  if (!plate) throw new Error("Informe a placa para consultar a APIPlacas.");
  const checkedAt = new Date().toISOString();
  if (!isValidPlate(plate)) {
    return {
      status: "INVALID_PLATE",
      plate,
      providerHttpStatus: null,
      message: "Placa fora do formato aceito pela APIPlacas.",
      snapshot: null,
      rawPayload: null,
      checkedAt,
    };
  }

  const token = process.env.APIPLACAS_TOKEN?.trim();
  if (!token) throw new Error("APIPLACAS_TOKEN não configurado no serviço da API.");

  let response: Response;
  try {
    response = await fetch(
      `https://wdapi2.com.br/consulta/${encodeURIComponent(plate)}/${encodeURIComponent(token)}`,
      { method: "GET", headers: { accept: "application/json" } },
    );
  } catch {
    return {
      status: "ERROR",
      plate,
      providerHttpStatus: null,
      message: "Não foi possível conectar à APIPlacas.",
      snapshot: null,
      rawPayload: null,
      checkedAt,
    };
  }

  const payload = await response.json().catch(() => ({}));
  const message = providerMessage(payload);
  const rawPayload = redactPayload(payload, token);
  if (response.status === 200) {
    return {
      status: "SUCCESS",
      plate,
      providerHttpStatus: response.status,
      message,
      snapshot: mapSnapshot(payload),
      rawPayload,
      checkedAt,
    };
  }
  if (response.status === 401 || response.status === 406) {
    return {
      status: response.status === 401 ? "INVALID_PLATE" : "NOT_FOUND",
      plate,
      providerHttpStatus: response.status,
      message,
      snapshot: null,
      rawPayload,
      checkedAt,
    };
  }
  if (response.status === 402) {
    return {
      status: "TOKEN_INVALID",
      plate,
      providerHttpStatus: response.status,
      message: message ?? "Token da APIPlacas inválido.",
      snapshot: null,
      rawPayload,
      checkedAt,
    };
  }
  if (response.status === 429) {
    return {
      status: "QUOTA_EXCEEDED",
      plate,
      providerHttpStatus: response.status,
      message: message ?? "Limite de consultas da APIPlacas atingido.",
      snapshot: null,
      rawPayload,
      checkedAt,
    };
  }
  return {
    status: "ERROR",
    plate,
    providerHttpStatus: response.status,
    message: message ?? "A APIPlacas não concluiu a consulta.",
    snapshot: null,
    rawPayload,
    checkedAt,
  };
}
