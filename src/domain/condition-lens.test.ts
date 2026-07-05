import { describe, expect, it } from "vitest";
import { diabetesLens, hypertensionLens, obesityLens, selectLens } from "./condition-lens";

describe("selectLens", () => {
  it("maps each condition to its lens", () => {
    expect(selectLens("hypertension")).toBe(hypertensionLens);
    expect(selectLens("diabetes")).toBe(diabetesLens);
    expect(selectLens("obesity")).toBe(obesityLens);
  });
});

describe("lens configuration", () => {
  it("authors hypertension with sodium first and an ACE rule", () => {
    expect(hypertensionLens.nutrientRules[0].nutrient).toBe("sodiumMg");
    expect(hypertensionLens.medDietRules).toHaveLength(1);
    expect(hypertensionLens.medDietRules[0].id).toBe("ace_arb_potassium");
  });

  it("keeps stubs valid but empty", () => {
    expect(diabetesLens.personaFocus.length).toBeGreaterThan(0);
    expect(diabetesLens.nutrientRules).toHaveLength(0);
    expect(obesityLens.personaFocus.length).toBeGreaterThan(0);
    expect(obesityLens.nutrientRules).toHaveLength(0);
  });
});
