import { describe, expect, it } from "vitest";
import { activeConditions, diabetesLens, hypertensionLens, obesityLens, selectLens, selectLenses } from "./condition-lens";

describe("selectLens", () => {
  it("maps each condition to its lens", () => {
    expect(selectLens("hypertension")).toBe(hypertensionLens);
    expect(selectLens("diabetes")).toBe(diabetesLens);
    expect(selectLens("obesity")).toBe(obesityLens);
  });
});

describe("activeConditions", () => {
  it("derives from the primary condition when no conditions array is set", () => {
    expect(activeConditions({ condition: "diabetes" })).toEqual(["diabetes"]);
  });

  it("orders and dedupes the conditions array canonically", () => {
    expect(activeConditions({ condition: "hypertension", conditions: ["diabetes", "hypertension"] })).toEqual([
      "hypertension",
      "diabetes"
    ]);
    expect(activeConditions({ condition: "diabetes", conditions: ["diabetes", "diabetes"] })).toEqual(["diabetes"]);
  });
});

describe("selectLenses", () => {
  it("returns the exact single lens reference for one active condition (identity contract)", () => {
    expect(selectLenses(["hypertension"])).toBe(hypertensionLens);
    expect(selectLenses(["diabetes"])).toBe(diabetesLens);
  });

  it("merges multiple lenses into a new lens that keeps each condition's focus", () => {
    const merged = selectLenses(["hypertension", "diabetes"]);
    expect(merged).not.toBe(hypertensionLens);
    expect(merged.nutrientRules.some((rule) => rule.nutrient === "sodiumMg")).toBe(true);
    expect(merged.personaFocus).toContain("sodium");
    expect(merged.personaFocus.toLowerCase()).toContain("carbohydrate");
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
