import { describe, expect, it } from "vitest";
import { serializeVehicle } from "./app.js";

describe("privacidade dos identificadores do veículo", () => {
  const vehicle: Parameters<typeof serializeVehicle>[0] = {
    id: "vehicle-test",
    slug: "van-de-teste",
    title: "Van de teste",
    category: "Van",
    operationMode: "RENT",
    availability: "AVAILABLE",
    brand: null,
    model: null,
    manufacturedYear: null,
    passengerCapacity: null,
    mileageKm: null,
    airConditioned: true,
    location: null,
    priceCents: null,
    description: "",
    isFeatured: false,
    sortOrder: 0,
    apiPlacasStatus: null,
    apiPlacasBrand: null,
    apiPlacasModel: null,
    apiPlacasMakeModel: null,
    apiPlacasYear: null,
    apiPlacasModelYear: null,
    apiPlacasColor: null,
    apiPlacasSituation: null,
    apiPlacasUf: null,
    apiPlacasOrigin: null,
    apiPlacasLogoUrl: null,
    apiPlacasCheckedAt: null,
    plate: "ABC1D23",
    renavam: "12345678901",
    chassi: "9BWZZZ377VT004251",
    features: [],
    publishedAt: new Date("2026-08-31T12:00:00Z"),
    createdAt: new Date("2026-08-31T12:00:00Z"),
    updatedAt: new Date("2026-08-31T12:00:00Z"),
  };

  it("oculta placa, RENAVAM e chassi nas respostas públicas", () => {
    const result = serializeVehicle(vehicle, []);
    expect(result).toMatchObject({
      title: "Van de teste",
      plate: null,
      renavam: null,
      chassi: null,
    });
    expect(result).not.toHaveProperty("documents");
    expect(result).not.toHaveProperty("plateLookup");
  });

  it("preserva identificadores no painel autenticado, mesmo sem documentos", () => {
    expect(serializeVehicle(vehicle, [], [])).toMatchObject({
      plate: vehicle.plate,
      renavam: vehicle.renavam,
      chassi: vehicle.chassi,
      documents: [],
    });
  });
});
