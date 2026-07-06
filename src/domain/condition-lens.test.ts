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
    expect(merged.personaFocus).toContain("sodium");
    expect(merged.personaFocus.toLowerCase()).toContain("carbohydrate");
  });

  it("unions hypertension and diabetes nutrient rules and dedupes shared nutrients", () => {
    const merged = selectLenses(["hypertension", "diabetes"]);
    const nutrients = merged.nutrientRules.map((rule) => rule.nutrient);
    expect(nutrients).toContain("sodiumMg"); // hypertension-only
    expect(nutrients).toContain("carbsG"); // diabetes-only
    expect(nutrients.filter((nutrient) => nutrient === "addedSugarsG")).toHaveLength(1); // shared, deduped
    expect(merged.medDietRules.map((rule) => rule.id)).toEqual(
      expect.arrayContaining(["ace_arb_potassium", "metformin_gi"])
    );
  });
});

describe("lens configuration", () => {
  it("authors hypertension with sodium first and an ACE rule", () => {
    expect(hypertensionLens.nutrientRules[0].nutrient).toBe("sodiumMg");
    expect(hypertensionLens.medDietRules).toHaveLength(1);
    expect(hypertensionLens.medDietRules[0].id).toBe("ace_arb_potassium");
  });

  it("authors diabetes with carbs first, a fiber encourage rule, and a metformin rule", () => {
    expect(diabetesLens.nutrientRules[0].nutrient).toBe("carbsG");
    expect(diabetesLens.nutrientRules.some((rule) => rule.nutrient === "fiberG" && rule.direction === "encourage")).toBe(true);
    expect(diabetesLens.medDietRules.map((rule) => rule.id)).toContain("metformin_gi");
  });

  it("keeps the obesity stub valid but empty", () => {
    expect(obesityLens.personaFocus.length).toBeGreaterThan(0);
    expect(obesityLens.nutrientRules).toHaveLength(0);
  });
});
