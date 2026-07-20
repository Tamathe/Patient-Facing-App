import { describe, expect, it } from "vitest";
import { PHQ2_INSTRUMENT } from "./phq2";

describe("PHQ-2 instrument", () => {
  it("locks the authoritative U.S. English and Spanish wording", () => {
    expect(PHQ2_INSTRUMENT.instructions).toEqual({
      en: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
      es: "Durante las últimas 2 semanas, ¿qué tan seguido ha tenido molestias debido a los siguientes problemas?"
    });
    expect(PHQ2_INSTRUMENT.items.map(({ en, es }) => ({ en, es }))).toEqual([
      { en: "Little interest or pleasure in doing things", es: "Poco interés o placer en hacer cosas" },
      {
        en: "Feeling down, depressed, or hopeless",
        es: "Se ha sentido decaído(a), deprimido(a) o sin esperanzas"
      }
    ]);
    expect(PHQ2_INSTRUMENT.defaultOptions).toEqual([
      { value: 0, en: "Not at all", es: "Ningún día" },
      { value: 1, en: "Several days", es: "Varios días" },
      { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
      { value: 3, en: "Nearly every day", es: "Casi todos los días" }
    ]);
  });

  it("scores 0-6 and expands to PHQ-9 at 3", () => {
    expect(PHQ2_INSTRUMENT.score([0, 2])).toEqual({ totalScore: 2, band: "negative" });
    expect(PHQ2_INSTRUMENT.score([1, 2])).toEqual({ totalScore: 3, band: "positive" });
    expect(PHQ2_INSTRUMENT.score([3, 3])).toEqual({ totalScore: 6, band: "positive" });
    expect(PHQ2_INSTRUMENT.followUp).toEqual({ minScore: 3, instrumentId: "phq9" });
    expect(PHQ2_INSTRUMENT).toMatchObject({ audience: "self", tier: 0, recurrenceDays: 90, wordingVerified: true, licenseStatus: "clear" });
  });
});
