import { describe, expect, it } from "vitest";
import { NIDA_SINGLE_INSTRUMENT } from "./nida-single";

describe("NIDA single-question drug screen", () => {
  it("locks the exact English clause and the P1 whole-number range", () => {
    expect(NIDA_SINGLE_INSTRUMENT.items).toMatchObject([
      {
        kind: "number",
        en: "How many times in the past year have you used an illegal drug or used a prescription medication for non-medical reasons (for example, because of the experience or feeling it caused)?",
        min: 0,
        max: 365,
        integer: true
      }
    ]);
  });

  it("is positive at one while keeping the unresolved wording and reuse gates visible", () => {
    expect(NIDA_SINGLE_INSTRUMENT.score([0])).toEqual({ totalScore: 0, band: "negative" });
    expect(NIDA_SINGLE_INSTRUMENT.score([1])).toEqual({ totalScore: 1, band: "positive" });
    expect(NIDA_SINGLE_INSTRUMENT.score([365])).toEqual({ totalScore: 365, band: "positive" });
    expect(NIDA_SINGLE_INSTRUMENT).toMatchObject({
      audience: "self",
      tier: 0,
      recurrenceDays: 90,
      wordingVerified: false,
      licenseStatus: "pending"
    });
    expect(NIDA_SINGLE_INSTRUMENT.items[0].es.length).toBeGreaterThan(0);
  });
});
