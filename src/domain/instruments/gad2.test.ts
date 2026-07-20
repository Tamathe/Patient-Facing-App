import { describe, expect, it } from "vitest";
import { GAD2_INSTRUMENT } from "./gad2";

describe("GAD-2 instrument", () => {
  it("locks the first two authoritative GAD-7 items and response copy", () => {
    expect(GAD2_INSTRUMENT.instructions).toEqual({
      en: "Over the last 2 weeks, how often have you been bothered by the following problems?",
      es: "Durante las últimas 2 semanas, ¿qué tan seguido ha tenido molestias debido a los siguientes problemas?"
    });
    expect(GAD2_INSTRUMENT.items.map(({ en, es }) => ({ en, es }))).toEqual([
      {
        en: "Feeling nervous, anxious or on edge",
        es: "Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta"
      },
      {
        en: "Not being able to stop or control worrying",
        es: "No ha sido capaz de parar o controlar su preocupación"
      }
    ]);
    expect(GAD2_INSTRUMENT.defaultOptions).toEqual([
      { value: 0, en: "Not at all", es: "Ningún día" },
      { value: 1, en: "Several days", es: "Varios días" },
      { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
      { value: 3, en: "Nearly every day", es: "Casi todos los días" }
    ]);
  });

  it("scores 0-6 and expands to GAD-7 at 3", () => {
    expect(GAD2_INSTRUMENT.score([1, 1])).toEqual({ totalScore: 2, band: "negative" });
    expect(GAD2_INSTRUMENT.score([0, 3])).toEqual({ totalScore: 3, band: "positive" });
    expect(GAD2_INSTRUMENT.score([3, 3])).toEqual({ totalScore: 6, band: "positive" });
    expect(GAD2_INSTRUMENT.followUp).toEqual({ minScore: 3, instrumentId: "gad7" });
    expect(GAD2_INSTRUMENT).toMatchObject({ audience: "self", tier: 0, recurrenceDays: 90, wordingVerified: true, licenseStatus: "clear" });
  });
});
