import { describe, expect, it } from "vitest";
import { TOBACCO_USE_INSTRUMENT } from "./tobacco-use";

describe("tobacco-use adaptation", () => {
  it("locks the CDC item texts and the product-adapted equality condition", () => {
    expect(TOBACCO_USE_INSTRUMENT.items).toMatchObject([
      {
        id: "current_use",
        en: "Do you now smoke cigarettes every day, some days, or not at all?",
        es: "Actualmente, ¿fuma cigarrillos todos los días, algunos días o no fuma para nada?",
        options: [
          { value: 2, en: "Every day", es: "Todos los días" },
          { value: 1, en: "Some days", es: "Algunos días" },
          { value: 0, en: "Not at all", es: "Para nada" }
        ]
      },
      {
        id: "lifetime_100",
        en: "Have you smoked at least 100 cigarettes in your entire life?",
        es: "¿Ha fumado al menos 100 cigarrillos en toda su vida?",
        options: [
          { value: 1, en: "Yes", es: "Sí" },
          { value: 0, en: "No", es: "No" }
        ],
        conditionalOn: { itemId: "current_use", atLeast: 0, atMost: 0 },
        notApplicableValue: -1
      }
    ]);
  });

  it("classifies current, former, and never use", () => {
    expect(TOBACCO_USE_INSTRUMENT.score([2, -1])).toEqual({ totalScore: 2, band: "current" });
    expect(TOBACCO_USE_INSTRUMENT.score([1, -1])).toEqual({ totalScore: 1, band: "current" });
    expect(TOBACCO_USE_INSTRUMENT.score([0, 1])).toEqual({ totalScore: 0, band: "former" });
    expect(TOBACCO_USE_INSTRUMENT.score([0, 0])).toEqual({ totalScore: 0, band: "never" });
    expect(TOBACCO_USE_INSTRUMENT).toMatchObject({ audience: "self", tier: 0, recurrenceDays: 90, wordingVerified: true, licenseStatus: "clear" });
  });
});
