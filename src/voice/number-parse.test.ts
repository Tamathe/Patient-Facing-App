import { describe, expect, it } from "vitest";
import { parseBpUtterance, parseGlucoseUtterance } from "./number-parse";

describe("parseBpUtterance", () => {
  it.each([
    ["120 over 80", "en", 120, 80],
    ["120/80", "en", 120, 80],
    ["one twenty over eighty", "en", 120, 80],
    ["one hundred and forty five over ninety", "en", 145, 90],
    ["ciento veinte sobre ochenta", "es", 120, 80],
    ["ciento cuarenta y cinco sobre noventa", "es", 145, 90]
  ] as const)("parses %s", (text, language, systolic, diastolic) => {
    expect(parseBpUtterance(text, language)).toMatchObject({ systolic, diastolic, pulse: null });
  });

  it("extracts bilingual context phrases and an optional pulse", () => {
    expect(parseBpUtterance("120 over 80 pulse 72 after resting in the morning", "en")).toEqual({
      systolic: 120,
      diastolic: 80,
      pulse: 72,
      contexts: ["morning", "after_resting"]
    });
    expect(parseBpUtterance("ciento veinte sobre ochenta pulso setenta y dos después de descansar", "es")).toEqual({
      systolic: 120,
      diastolic: 80,
      pulse: 72,
      contexts: ["after_resting"]
    });
  });

  it("ignores unknown trailing words after plausible numbers", () => {
    expect(parseBpUtterance("120 over 80 with the blue cuff", "en")).toMatchObject({ systolic: 120, diastolic: 80 });
  });

  it.each(["nothing useful", "99999 over 80", "120"])("rejects ambiguous or garbage BP input: %s", (text) => {
    expect(parseBpUtterance(text, "en")).toBeNull();
  });
});

describe("parseGlucoseUtterance", () => {
  it.each([
    ["145", "en", 145],
    ["one forty five", "en", 145],
    ["one hundred and forty five", "en", 145],
    ["ciento cuarenta y cinco", "es", 145]
  ] as const)("parses %s", (text, language, valueMgDl) => {
    expect(parseGlucoseUtterance(text, language)).toEqual({ valueMgDl, contexts: [] });
  });

  it.each([
    ["145 after resting", "en", "after_resting"],
    ["145 before medicine", "en", "before_medicine"],
    ["145 during symptoms", "en", "during_symptoms"],
    ["145 después del medicamento", "es", "after_medicine"],
    ["145 después del café", "es", "after_coffee"],
    ["145 por la noche", "es", "evening"]
  ] as const)("extracts context from %s", (text, language, context) => {
    expect(parseGlucoseUtterance(text, language)?.contexts).toContain(context);
  });

  it("keeps a good number when trailing words are unknown", () => {
    expect(parseGlucoseUtterance("145 from my new meter", "en")).toEqual({ valueMgDl: 145, contexts: [] });
  });

  it.each(["no number here", "99999", "twenty forty"])("rejects garbage number input: %s", (text) => {
    expect(parseGlucoseUtterance(text, "en")).toBeNull();
  });
});
