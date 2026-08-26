import { describe, expect, it } from "vitest";
import { vehicleInputSchema } from "@transporte-seguro/catalog-contracts";

describe("contrato de veículos", () => {
  it("aceita um veículo sem CRLV", () => {
    const result = vehicleInputSchema.parse({
      title: "Van de teste",
      slug: "van-de-teste",
      category: "Fretamento",
      operationMode: "RENT",
      availability: "AVAILABLE",
      publishedAt: null,
    });

    expect(result.title).toBe("Van de teste");
    expect(result.airConditioned).toBe(true);
  });

  it("rejeita slug inseguro", () => {
    expect(() =>
      vehicleInputSchema.parse({
        title: "Van",
        slug: "Van com espaço",
        category: "Fretamento",
        operationMode: "RENT",
        availability: "AVAILABLE",
      }),
    ).toThrow();
  });
});
