import { describe, expect, it } from "vitest";
import {
  foodLensStrings,
  privacyStrings,
  safetyStrings,
  screeningStrings,
  t,
  tPrivacy,
  tSafety,
  tScreening
} from "./strings";

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
  const catalogs = { foodLensStrings, privacyStrings, safetyStrings, screeningStrings };

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

  it("discloses live AI data use in Spanish", () => {
    expect(tPrivacy("es", "liveBody")).toContain("OpenAI");
    expect(tPrivacy("es", "liveBody")).toMatch(/audio|micr[oó]fono/i);
  });
});

// The five grade strings are LOCKED (docs/plans/09 clinical line): report-first
// phrasing, never a diagnosis claim, both languages carrying equal urgency.
describe("screening grade copy — locked", () => {
  it("keeps the exact locked English grade copy", () => {
    expect(tScreening("en", "gradeNoDr")).toBe("Your report says no signs of diabetic eye disease were found.");
    expect(tScreening("en", "gradeMild")).toBe(
      "Your report shows mild early changes. No specialist visit is needed now — a repeat photo in 12 months keeps watch."
    );
    expect(tScreening("en", "gradeModerateSevere")).toBe(
      "Your report shows changes that need a closer look by an eye doctor. This is common and treatable when caught early."
    );
    expect(tScreening("en", "gradeDmePdr")).toBe(
      "Your report shows changes that need care soon. Getting seen quickly protects your vision. Your referral has already been sent."
    );
    expect(tScreening("en", "gradeUngradable")).toBe(
      "The image could not be read clearly, which happens sometimes. A quick repeat screening is all that is needed."
    );
  });

  it("speaks about the report, never a diagnosis, in both languages", () => {
    const gradeKeys = ["gradeNoDr", "gradeMild", "gradeModerateSevere", "gradeDmePdr"] as const;
    for (const key of gradeKeys) {
      expect(tScreening("en", key)).toMatch(/^Your report (says|shows)/);
      expect(tScreening("es", key)).toMatch(/^Tu reporte (dice|muestra)/);
      expect(tScreening("en", key)).not.toMatch(/\bYou have\b/i);
      expect(tScreening("es", key)).not.toMatch(/\bTienes\b/i);
    }
  });

  it("carries equal urgency in Spanish for the needs-care-soon branch", () => {
    expect(tScreening("es", "gradeDmePdr")).toContain("pronto");
    expect(tScreening("es", "gradeDmePdr")).toContain("referido ya fue enviado");
  });
});
