import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { hypertensionLens } from "@/domain/condition-lens";
import type { FoodFlag } from "@/domain/food-flags";
import { buildFoodLensInstructions, buildPerAskContext } from "./food-instructions";

describe("buildFoodLensInstructions", () => {
  it("includes the patient name, medication, condition, and reading trend", () => {
    const instructions = buildFoodLensInstructions(demoState, hypertensionLens);
    expect(instructions).toContain("Jordan");
    expect(instructions).toContain("Lisinopril");
    expect(instructions).toContain("hypertension");
    expect(instructions).toContain("trending up");
  });

  it("includes the ACE medication guidance only when the med matches", () => {
    const withMed = buildFoodLensInstructions(demoState, hypertensionLens);
    expect(withMed).toContain("salt substitutes");

    const noMed = buildFoodLensInstructions({ ...demoState, medications: [] }, hypertensionLens);
    expect(noMed).not.toContain("salt substitutes");
  });

  it("directs the model to speak Spanish for a Spanish-speaking patient", () => {
    const instructions = buildFoodLensInstructions(
      { ...demoState, patient: { ...demoState.patient, language: "es" } },
      hypertensionLens
    );
    expect(instructions).toContain("Speak Spanish");
  });
});

describe("buildPerAskContext", () => {
  const flags: FoodFlag[] = [{ id: "nutrient-sodiumMg", severity: "warning", text: "890 mg sodium — 59% of your 1500 mg daily limit" }];

  it("embeds the food JSON and flags", () => {
    const context = buildPerAskContext(
      { id: "1", barcode: "1", name: "Soup", brand: "Campbell's", category: "Soups", nutrition: null, source: "barcode_seed" },
      flags
    );
    expect(context).toContain("Soup");
    expect(context).toContain("890 mg sodium");
  });

  it("reports no food data when the food is null", () => {
    const context = buildPerAskContext(null, []);
    expect(context).toContain('"foodData":"none"');
    expect(context).toContain("- none");
  });
});
