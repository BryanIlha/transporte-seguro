import { normalizeCrlvPlate, type CrlvData } from "./crlv-parser";

type CrlvVehicleFields = {
  plate: string;
  renavam: string;
  chassi: string;
  brand: string;
  model: string;
  manufacturedYear: string;
  passengerCapacity: string;
};

export function applyCrlvFields<T extends CrlvVehicleFields>(current: T, data: CrlvData): T {
  const makeModel = String(data.marca_modelo_versao ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const withoutImportPrefix = makeModel.replace(/^I\//, "");
  const separator = withoutImportPrefix.indexOf("/");
  const brand = separator > 0 ? withoutImportPrefix.slice(0, separator) : "";
  const model = separator > 0 ? withoutImportPrefix.slice(separator + 1) : withoutImportPrefix;

  return {
    ...current,
    plate: current.plate || normalizeCrlvPlate(data.placa),
    renavam: current.renavam || String(data.renavam ?? ""),
    chassi: current.chassi || String(data.chassi ?? ""),
    brand: current.brand || brand,
    model: current.model || model,
    manufacturedYear: current.manufacturedYear || String(data.ano_fabricacao ?? ""),
    passengerCapacity: current.passengerCapacity || String(data.lotacao_pessoas ?? ""),
  };
}
