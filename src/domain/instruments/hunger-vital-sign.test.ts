import { describe, expect, it } from "vitest";
import { HUNGER_VITAL_SIGN_INSTRUMENT } from "./hunger-vital-sign";

describe("Hunger Vital Sign instrument", () => {
  it("preserves the owner form wording including its Spanish source spelling", () => {
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.instructions).toEqual({
      en: "For each of the following statements, please tell me which one is ‘often true,’ ‘sometimes true’ or ‘never true’ for the past 12 months, that is since last [name of current month].",
      es: "Por cada una de las siguientes declaraciones, por favor indique si la declaracion se aplica a su familia ‘frecuentemente,’ ‘a veces’ o ‘nunca’ durante los últimos 12 meses, es decir desde [nombre del mes actual] del año pasado."
    });
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.items.map(({ en, es }) => ({ en, es }))).toEqual([
      {
        en: "We (I) worried whether our food would run out before we (I) got money to buy more",
        es: "Estábamos (Estaba) preocupado(s) de que los alimentos se acabaran antes de que tuviéramos (tuviera) suficiente dinero para comprar más."
      },
      {
        en: "The food that we (I) bought just didn't last and we (I) didn't have money to get more",
        es: "Los alimentos que compramos (compré) no duraron mucho y no teníamos (tenía) suficiente dinero para comprar más."
      }
    ]);
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.defaultOptions).toEqual([
      { value: 2, en: "Often true", es: "Frecuentemente" },
      { value: 1, en: "Sometimes true", es: "A veces" },
      { value: 0, en: "Never true", es: "Nunca" }
    ]);
  });

  it("is positive when either item is often or sometimes true without an additive severity score", () => {
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.score([0, 0])).toEqual({ totalScore: 0, band: "negative" });
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.score([1, 0])).toEqual({ totalScore: 1, band: "positive" });
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.score([0, 2])).toEqual({ totalScore: 2, band: "positive" });
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.score([2, 2])).toEqual({ totalScore: 2, band: "positive" });
    expect(HUNGER_VITAL_SIGN_INSTRUMENT.recurrenceDays).toBe(90);
  });
});
