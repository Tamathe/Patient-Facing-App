import { describe, expect, it } from "vitest";
import { foodLensStrings, t, type FoodLensStringKey } from "./strings";

describe("t", () => {
  it("interpolates variables", () => {
    expect(t("en", "flagSodium", { amount: 890, percent: 59, limit: 1500 })).toBe(
      "890 mg sodium — 59% of your 1500 mg daily limit"
    );
  });

  it("leaves unknown variables literal", () => {
    expect(t("en", "flagPotassiumMed", {})).toContain("{med}");
  });

  it("returns Spanish strings", () => {
    expect(t("es", "logThis")).toBe("Guardar");
  });
});

describe("locale parity", () => {
  it("defines every key in both locales", () => {
    const enKeys = Object.keys(foodLensStrings.en) as FoodLensStringKey[];
    const esKeys = Object.keys(foodLensStrings.es) as FoodLensStringKey[];
    expect(new Set(esKeys)).toEqual(new Set(enKeys));
  });
});
