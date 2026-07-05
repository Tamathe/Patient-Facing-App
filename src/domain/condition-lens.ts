import type { FoodLensStringKey } from "@/i18n/strings";
import type { Condition, NutritionFacts } from "./types";

export type NumericNutrient = Exclude<keyof NutritionFacts, "servingSize">;

export type NutrientRule = {
  nutrient: NumericNutrient;
  dailyLimit: number;
  unit: "mg" | "g" | "kcal";
  direction: "limit" | "encourage";
  cautionAtPercent: number;
  warningAtPercent: number | null;
  encourageAtPercent: number | null;
  flagKey: FoodLensStringKey;
};

export type MedDietRule = {
  id: string;
  medicationNames: string[];
  productPattern: RegExp | null;
  nutrientTrigger: { nutrient: NumericNutrient; atLeast: number } | null;
  patternFlagKey: FoodLensStringKey;
  nutrientFlagKey: FoodLensStringKey;
  modelGuidance: string;
  suppressEncourage?: NumericNutrient;
};

export type ConditionLens = {
  condition: Condition;
  personaFocus: string;
  nutrientRules: NutrientRule[];
  medDietRules: MedDietRule[];
  betterOptionGuidance: string;
};

export const hypertensionLens: ConditionLens = {
  condition: "hypertension",
  personaFocus:
    "Focus on sodium first. Use a DASH-style lens: lower sodium, more vegetables and fruit, and small consistent swaps rather than big changes. When it helps, connect your advice to the patient's own blood-pressure readings and their trend.",
  nutrientRules: [
    {
      nutrient: "sodiumMg",
      dailyLimit: 1500,
      unit: "mg",
      direction: "limit",
      cautionAtPercent: 15,
      warningAtPercent: 30,
      encourageAtPercent: null,
      flagKey: "flagSodium"
    },
    {
      nutrient: "saturatedFatG",
      dailyLimit: 13,
      unit: "g",
      direction: "limit",
      cautionAtPercent: 25,
      warningAtPercent: 50,
      encourageAtPercent: null,
      flagKey: "flagSaturatedFat"
    },
    {
      nutrient: "addedSugarsG",
      dailyLimit: 25,
      unit: "g",
      direction: "limit",
      cautionAtPercent: 30,
      warningAtPercent: 60,
      encourageAtPercent: null,
      flagKey: "flagAddedSugars"
    },
    {
      nutrient: "potassiumMg",
      dailyLimit: 3500,
      unit: "mg",
      direction: "encourage",
      cautionAtPercent: 0,
      warningAtPercent: null,
      encourageAtPercent: 10,
      flagKey: "flagPotassiumGood"
    },
    {
      nutrient: "fiberG",
      dailyLimit: 28,
      unit: "g",
      direction: "encourage",
      cautionAtPercent: 0,
      warningAtPercent: null,
      encourageAtPercent: 10,
      flagKey: "flagFiberGood"
    }
  ],
  medDietRules: [
    {
      id: "ace_arb_potassium",
      medicationNames: [
        "lisinopril",
        "enalapril",
        "ramipril",
        "benazepril",
        "losartan",
        "valsartan",
        "olmesartan",
        "spironolactone",
        "eplerenone",
        "amiloride",
        "triamterene"
      ],
      productPattern: /salt substitute|lite salt|potassium chloride|no.?salt/i,
      nutrientTrigger: { nutrient: "potassiumMg", atLeast: 400 },
      patternFlagKey: "flagSaltSubstituteMed",
      nutrientFlagKey: "flagPotassiumMed",
      modelGuidance:
        "The patient takes an ACE inhibitor or related medicine. Never recommend salt substitutes or push high-potassium foods. If the product is a salt substitute or high in potassium, tell the patient to check with their care team first.",
      suppressEncourage: "potassiumMg"
    }
  ],
  betterOptionGuidance:
    "When you suggest a better option, keep it the same kind of food, keep it generic (a food category or common product type), and never name a specific store or say where to buy it."
};

export const diabetesLens: ConditionLens = {
  condition: "diabetes",
  personaFocus:
    "Focus on carbohydrates, added sugars, and portion size, and encourage fiber. Keep guidance practical and plain.",
  nutrientRules: [],
  medDietRules: [],
  betterOptionGuidance: hypertensionLens.betterOptionGuidance
};

export const obesityLens: ConditionLens = {
  condition: "obesity",
  personaFocus:
    "Focus on calories, portion size, protein quality, and satiety. Keep guidance encouraging and non-judgmental.",
  nutrientRules: [],
  medDietRules: [],
  betterOptionGuidance: hypertensionLens.betterOptionGuidance
};

export function selectLens(condition: Condition): ConditionLens {
  switch (condition) {
    case "diabetes":
      return diabetesLens;
    case "obesity":
      return obesityLens;
    case "hypertension":
    default:
      return hypertensionLens;
  }
}
