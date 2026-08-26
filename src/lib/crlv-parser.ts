export type CrlvExtractionStatus = "ok" | "revisar" | "erro";

export type CrlvData = {
  paginas: number;
  status_extracao: CrlvExtractionStatus;
  erro_extracao: string | null;
  uf_detran: string | null;
  renavam: string | null;
  placa: string | null;
  exercicio: number | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  numero_crv: string | null;
  categoria: string | null;
  capacidade: string | null;
  potencia_cilindrada: string | null;
  potencia_cv: number | null;
  peso_bruto_total_t: number | null;
  motor: string | null;
  cmt_t: number | null;
  eixos: number | null;
  lotacao_pessoas: number | null;
  carroceria: string | null;
  marca_modelo_versao: string | null;
  especie_tipo: string | null;
  placa_anterior_uf: string | null;
  chassi: string | null;
  cor_predominante: string | null;
  combustivel: string | null;
  codigo_seguranca_cla: string | null;
  cat: string | null;
  proprietario_nome: string | null;
  cpf_cnpj_proprietario: string | null;
  local_emissao: string | null;
  data_documento: string | null;
  observacoes: string | null;
  emitido_portal_em: string | null;
  mensagens_senatran: string | null;
  [key: string]: unknown;
};

export type CrlvParseResult = {
  data: CrlvData;
  texto_extraido: string;
  texto_layout: string;
  paginas: number;
};

export const CRLV_FIELD_LABELS: Record<string, string> = {
  uf_detran: "UF do DETRAN",
  renavam: "RENAVAM",
  placa: "Placa",
  exercicio: "Exercício",
  ano_fabricacao: "Ano de fabricação",
  ano_modelo: "Ano modelo",
  numero_crv: "Número do CRV",
  categoria: "Categoria",
  capacidade: "Capacidade",
  potencia_cilindrada: "Potência/Cilindrada",
  potencia_cv: "Potência (CV)",
  peso_bruto_total_t: "Peso bruto total (t)",
  motor: "Motor",
  cmt_t: "CMT (t)",
  eixos: "Eixos",
  lotacao_pessoas: "Lotação",
  carroceria: "Carroceria",
  marca_modelo_versao: "Marca / modelo / versão",
  especie_tipo: "Espécie / tipo",
  placa_anterior_uf: "Placa anterior / UF",
  chassi: "Chassi",
  cor_predominante: "Cor predominante",
  combustivel: "Combustível",
  proprietario_nome: "Proprietário",
  cpf_cnpj_proprietario: "CPF / CNPJ do proprietário",
  local_emissao: "Local de emissão",
  data_documento: "Data do documento",
  observacoes: "Observações",
};

const PLACA_RE = /\b[A-Z]{3}[- ]?\d[A-Z0-9]\d{2}\b/;
const RENAVAM_RE = /\b\d{11}\b/;
const CHASSI_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/;
const CNPJ_RE = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
const CPF_RE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const DATA_RE = /\b\d{2}\/\d{2}\/\d{4}\b/;
const EMISSAO_RE = /Documento emitido.*?em\s+(\d{2}\/\d{2}\/\d{4})\s+às?\s+(\d{2}:\d{2}:\d{2})/i;

function semAcentos(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function limparTexto(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function linhasUteis(texto: string) {
  return texto
    .split(/\r?\n/)
    .map((line) => limparTexto(line))
    .filter(Boolean) as string[];
}

function primeiroMatch(pattern: RegExp, texto: string, group = 1) {
  const match = texto.match(pattern);
  return limparTexto(match?.[group] ?? null);
}

function blocosDaLinha(linha: string | null) {
  if (!linha) return [];
  return linha
    .trim()
    .split(/\s{3,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function linhaEmOffset(linhas: string[], rotulo: string, offset: number) {
  const normalizedLabel = semAcentos(rotulo).toUpperCase();
  for (let index = 0; index < linhas.length; index += 1) {
    if (semAcentos(linhas[index]).toUpperCase().includes(normalizedLabel)) {
      return linhas[index + offset] ?? null;
    }
  }
  return null;
}

function asInteger(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function asDecimal(value: string | null) {
  if (!value) return null;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extrairPlacaEAno(linhas: string[]) {
  for (let index = 0; index < linhas.length; index += 1) {
    const placa = linhas[index].match(PLACA_RE);
    if (!placa) continue;

    const anosNaLinha = linhas[index].match(/\b(?:19|20)\d{2}\b/g) ?? [];
    const anosProximos =
      linhas
        .slice(index, index + 8)
        .join(" ")
        .match(/\b(?:19|20)\d{2}\b/g) ?? [];
    return {
      placa: placa[0].replace(/[- ]/g, ""),
      exercicio: asInteger(anosNaLinha[0] ?? anosProximos[0] ?? null),
      ano_fabricacao: asInteger(anosProximos[1] ?? null),
      ano_modelo: asInteger(anosProximos[2] ?? null),
    };
  }

  return { placa: null, exercicio: null, ano_fabricacao: null, ano_modelo: null };
}

function indexOfLabel(linhas: string[], rotulo: string) {
  const normalizedLabel = semAcentos(rotulo).toUpperCase();
  return linhas.findIndex((line) => semAcentos(line).toUpperCase().includes(normalizedLabel));
}

function firstLineAfter(
  linhas: string[],
  rotulo: string,
  predicate: (line: string) => boolean,
  maxOffset = 8,
) {
  const start = indexOfLabel(linhas, rotulo);
  if (start < 0) return null;
  return linhas.slice(start + 1, start + maxOffset + 1).find(predicate) ?? null;
}

export function parseCrlvText(
  textoLayout: string,
  textoSimples: string,
  paginas: number,
): CrlvParseResult {
  const layout = semAcentos(textoLayout).toUpperCase();
  const simples = semAcentos(textoSimples).toUpperCase();
  const linhasLayout = layout.split(/\r?\n/);
  const linhasSimples = linhasUteis(simples);
  const placaEAno = extrairPlacaEAno(
    linhasLayout.filter(Boolean).length > 0 ? linhasLayout : linhasSimples,
  );
  const potencia = primeiroMatch(/(\d+)\s*CV(?:\/[^\s]+)?\s+([\d.,]+)/, layout, 0);
  const potenciaMatch = potencia?.match(/(\d+)\s*CV(?:\/[^\s]+)?\s+([\d.,]+)/i);
  const motorMatch =
    layout.match(
      /MOTOR.*?CMT.*?EIXOS.*?LOTACAO\s*\n\s*([A-Z0-9]{8,20})\s+([\d.,]+)\s+(\d+)\s+(\d+)P/s,
    ) ?? simples.match(/\b([A-Z0-9]{8,20})\b\s+([\d.,]+)\s+(\d+)\s+(\d+)P/);
  const corCombustivel = blocosDaLinha(
    firstLineAfter(
      linhasLayout,
      "COR PREDOMINANTE",
      (line) => /BRANCA|PRETA|PRATA|VERMELHA|AZUL|AMARELA|VERDE|CINZA|DOURADA|BEGE/i.test(line),
      5,
    ),
  );
  const nomeLinha = blocosDaLinha(
    firstLineAfter(
      linhasLayout,
      "NOME",
      (line) =>
        /[A-Z]{3}/i.test(line) && !/VALIDE|CPF|CODIGO|LOCAL|MARCA|DOCUMENTO|QR.?CODE/i.test(line),
      5,
    ),
  );
  const marcaLinha = blocosDaLinha(
    firstLineAfter(
      linhasLayout,
      "MARCA / MODELO / VERSAO",
      (line) => /\bI\/M\.|\bM\.[A-Z]/i.test(line),
      8,
    ),
  );
  const especieLinha = blocosDaLinha(
    firstLineAfter(
      linhasLayout,
      "ESPECIE / TIPO",
      (line) => /PASSAGEIRO|CARGA|MISTO|ESPECIAL|TRACAO/i.test(line),
      8,
    ),
  );
  const carroceriaLinha = blocosDaLinha(
    firstLineAfter(
      linhasLayout,
      "CARROCERIA",
      (line) => /NAO APLICAVEL|ABERTA|FECHADA|CARROCERIA/i.test(line),
      3,
    ),
  );
  const placaAnteriorLinha = blocosDaLinha(
    firstLineAfter(
      linhasLayout,
      "PLACA ANTERIOR / UF",
      (line) => CHASSI_RE.test(semAcentos(line).toUpperCase()),
      5,
    ),
  );
  const segurancaMatch = layout.match(/CODIGO DE SEGURANCA DO CLA.*?\n\s*(\d{11})\s+([^\s]+)/s);
  const dataLinha = linhasLayout.find(
    (line) => DATA_RE.test(line) && !line.includes("DOCUMENTO EMITIDO"),
  );
  const dataDocumento = dataLinha?.match(DATA_RE)?.[0] ?? null;
  const dataIndex = dataLinha?.indexOf(dataDocumento ?? "") ?? -1;
  const localEmissao =
    dataLinha && dataIndex >= 0
      ? (blocosDaLinha(dataLinha.slice(0, dataIndex)).at(-1) ??
        limparTexto(dataLinha.slice(0, dataIndex)))
      : null;
  const emissao = EMISSAO_RE.exec(textoSimples);
  const chassi = primeiroMatch(CHASSI_RE, simples, 0) ?? placaAnteriorLinha[1] ?? null;
  const renavam =
    primeiroMatch(/CODIGO RENAVAM\s*\n\s*(\d{11})/, layout) ??
    primeiroMatch(RENAVAM_RE, simples, 0);
  const dados: CrlvData = {
    paginas,
    status_extracao: "ok",
    erro_extracao: null,
    uf_detran: primeiroMatch(/DETRAN-\s*([A-Z]{2})/, layout),
    renavam,
    ...placaEAno,
    numero_crv: primeiroMatch(/^\s*NUMERO DO CRV[^\n]*\n\s*([*A-Z0-9./-]+)/m, layout),
    categoria: limparTexto(linhaEmOffset(linhasLayout, "CATEGORIA", 1)),
    capacidade: primeiroMatch(/(\*+\.\*+)/, layout, 1),
    potencia_cilindrada: potenciaMatch?.[0].match(/^\d+\s*CV(?:\/\S+)?/)?.[0] ?? potencia,
    potencia_cv: potenciaMatch ? asInteger(potenciaMatch[1]) : null,
    peso_bruto_total_t: potenciaMatch ? asDecimal(potenciaMatch[2]) : null,
    motor: motorMatch?.[1] ?? null,
    cmt_t: motorMatch ? asDecimal(motorMatch[2]) : null,
    eixos: motorMatch ? asInteger(motorMatch[3]) : null,
    lotacao_pessoas: motorMatch ? asInteger(motorMatch[4]) : null,
    carroceria: carroceriaLinha.at(-1) ?? null,
    marca_modelo_versao: marcaLinha[0] ?? null,
    especie_tipo: especieLinha[0] ?? null,
    placa_anterior_uf: placaAnteriorLinha[0] ?? null,
    chassi,
    cor_predominante: corCombustivel[0] ?? null,
    combustivel: corCombustivel[1] ?? null,
    codigo_seguranca_cla: segurancaMatch?.[1] ?? null,
    cat: segurancaMatch?.[2] ?? null,
    proprietario_nome: nomeLinha[0] ?? null,
    cpf_cnpj_proprietario:
      primeiroMatch(CNPJ_RE, textoSimples, 0) ?? primeiroMatch(CPF_RE, textoSimples, 0),
    local_emissao: localEmissao,
    data_documento: dataDocumento,
    observacoes: limparTexto(linhaEmOffset(linhasLayout, "OBSERVACOES DO VEICULO", 1)),
    emitido_portal_em: emissao ? `${emissao[1]} ${emissao[2]}` : null,
    mensagens_senatran: firstLineAfter(
      linhasLayout,
      "MENSAGENS SENATRAN",
      (line) => Boolean(line.trim()),
      8,
    ),
  };

  if (textoLayout.trim().length < 200 && textoSimples.trim().length < 200) {
    dados.status_extracao = "revisar";
    dados.erro_extracao =
      "O PDF não possui texto digital suficiente. Confira os campos do documento manualmente.";
  } else {
    const faltantes = ["placa", "renavam", "chassi"].filter((key) => !dados[key]);
    if (faltantes.length > 0) {
      dados.status_extracao = "revisar";
      dados.erro_extracao = `Campos importantes ausentes: ${faltantes.join(", ")}.`;
    }
  }

  return { data: dados, texto_extraido: textoSimples, texto_layout: textoLayout, paginas };
}

export function normalizeCrlvPlate(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function normalizeDocumentIdentityPart(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim();
}

export function getCrlvDocumentFingerprint(data: Partial<CrlvData> | null | undefined) {
  if (!data) return null;
  const placa = normalizeCrlvPlate(data.placa);
  const renavam = normalizeDocumentIdentityPart(data.renavam);
  const chassi = normalizeDocumentIdentityPart(data.chassi);
  const referencia = [data.exercicio, data.data_documento, data.numero_crv]
    .map(normalizeDocumentIdentityPart)
    .filter(Boolean);

  if (!placa || !renavam || !chassi || referencia.length === 0) return null;
  return ["CRLV", placa, renavam, chassi, ...referencia].join("|");
}

export function crlvFieldValue(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
