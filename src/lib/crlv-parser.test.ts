import { describe, expect, it } from "vitest";
import { parseCrlvText } from "./crlv-parser";
import { applyCrlvFields } from "./crlv-vehicle-fields";

// Synthetic values with the same two-column layout and masked CMT used by CRLV PDFs.
const layout = `CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEICULO - DIGITAL     CATEGORIA     CAPACIDADE
ALUGUEL
CODIGO RENAVAM     *.*
00000000001     POTENCIA/CILINDRADA     PESO BRUTO TOTAL
PLACA     EXERCICIO     177CV/****     8.6
ABC1D23     2025     MOTOR     CMT     EIXOS     LOTACAO
QRCode
ANO FABRICACAO     ANO MODELO     904968U000001     *.*     2     39P
2006     2006     CARROCERIA
NUMERO DO CRV     TRANSPORTE DE ESCOLARES
***     NOME
MARCA / MODELO / VERSAO
M.BENZ/MODELO  DE TESTE
ESPECIE / TIPO
PASSAGEIRO ONIBUS
PLACA ANTERIOR / UF     CHASSI
*******/**     9BWZZZ377VT000001
COR PREDOMINANTE     COMBUSTIVEL
AMARELA     DIESEL`;

const empty = {
  plate: "",
  renavam: "",
  chassi: "",
  brand: "",
  model: "",
  manufacturedYear: "",
  passengerCapacity: "",
};

function parse(text = layout) {
  return parseCrlvText(text, text.replace(/\s+/g, " "), 1).data;
}

describe("CRLV digital sem consulta externa", () => {
  it("extrai motor, eixos e lotação mesmo com CMT mascarada e rótulos da outra coluna", () => {
    expect(parse()).toMatchObject({
      placa: "ABC1D23",
      ano_fabricacao: 2006,
      ano_modelo: 2006,
      motor: "904968U000001",
      cmt_t: null,
      eixos: 2,
      lotacao_pessoas: 39,
      carroceria: "TRANSPORTE DE ESCOLARES",
      status_extracao: "ok",
    });
  });

  it("preserva uma CMT numérica com vírgula decimal", () => {
    expect(parse(layout.replace("000001     *.*", "000001     12,5"))).toMatchObject({
      cmt_t: 12.5,
      lotacao_pessoas: 39,
    });
  });

  it("preenche marca, modelo, ano, lotação e identificadores diretamente do CRLV", () => {
    expect(applyCrlvFields(empty, parse())).toEqual({
      plate: "ABC1D23",
      renavam: "00000000001",
      chassi: "9BWZZZ377VT000001",
      brand: "M.BENZ",
      model: "MODELO DE TESTE",
      manufacturedYear: "2006",
      passengerCapacity: "39",
    });
  });

  it("reconhece outras marcas e o prefixo de importação sem depender da APIPlacas", () => {
    for (const name of ["FIAT/DUCATO", "I/FIAT/DUCATO"]) {
      const data = parse(layout.replace("M.BENZ/MODELO  DE TESTE", name));
      expect(applyCrlvFields(empty, data)).toMatchObject({ brand: "FIAT", model: "DUCATO" });
    }
  });

  it("não sobrescreve os dados que o usuário já preencheu", () => {
    const current = {
      ...empty,
      brand: "Marca conferida",
      model: "Modelo conferido",
      passengerCapacity: "38",
      title: "Meu anúncio",
    };
    expect(applyCrlvFields(current, parse())).toMatchObject({
      brand: current.brand,
      model: current.model,
      passengerCapacity: "38",
      title: "Meu anúncio",
    });
  });

  it("pede revisão para PDF sem texto suficiente em vez de inventar dados", () => {
    const data = parse("");
    expect(data.status_extracao).toBe("revisar");
    expect(applyCrlvFields(empty, data)).toEqual(empty);
  });
});
