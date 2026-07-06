import { describe, expect, it } from "vitest";
import { foodLensStrings, safetyStrings, t, tSafety } from "./strings";

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
  const catalogs = { foodLensStrings, safetyStrings };

  it.each(Object.entries(catalogs))("defines every %s key in both locales", (_name, catalog) => {
    const enKeys = Object.keys(catalog.en);
    const esKeys = Object.keys(catalog.es);
    expect(new Set(esKeys)).toEqual(new Set(enKeys));
  });

  it("returns Spanish safety strings with equal urgency", () => {
    expect(tSafety("es", "callEmergency")).toBe("Llama al 911");
    expect(tSafety("es", "crisisResponse")).toContain("988");
    expect(tSafety("es", "crisisResponse")).toContain("911");
  });
});
