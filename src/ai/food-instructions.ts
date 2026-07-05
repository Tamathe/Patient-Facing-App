import { activeMedDietRules, type FoodFlag } from "@/domain/food-flags";
import type { ConditionLens } from "@/domain/condition-lens";
import type { AppState, HomeReading, IdentifiedFood } from "@/domain/types";

export const FOOD_LENS_PROMPT_VERSION = "food-lens-v0.1-2026-07-05";

function trendDirection(readings: HomeReading[]): string {
  if (readings.length < 2) {
    return "not enough readings yet";
  }
  const sorted = [...readings].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const net = sorted[sorted.length - 1].systolic - sorted[0].systolic;
  if (net >= 8) {
    return "trending up";
  }
  if (net <= -8) {
    return "trending down";
  }
  return "roughly steady";
}

function nutrientLimitLines(lens: ConditionLens): string {
  return lens.nutrientRules
    .map((rule) => {
      const aim = rule.direction === "limit" ? "keep under" : "encourage";
      return `- ${rule.nutrient}: ${aim} (${rule.dailyLimit} ${rule.unit}/day reference)`;
    })
    .join("\n");
}

function patientCard(state: AppState): string {
  const { patient, carePlan, medications, readings } = state;
  const latest = [...readings].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)).at(-1);
  const goals = carePlan.goals.map((goal) => goal.label).join("; ") || "none recorded";
  const meds =
    medications.length > 0
      ? medications.map((med) => `${med.name} ${med.dose} (${med.schedule}) — ${med.purpose}`).join("; ")
      : "none recorded";
  const latestReading = latest ? `${latest.systolic}/${latest.diastolic}` : "none recorded";

  return [
    `Patient: ${patient.preferredName}, speaks ${patient.language === "es" ? "Spanish" : "English"}.`,
    `Condition: ${carePlan.condition}.`,
    `Goals: ${goals}.`,
    `Medications: ${meds}.`,
    `Latest blood pressure: ${latestReading}; trend: ${trendDirection(readings)}.`,
    `Call the care team if blood pressure is at or above ${carePlan.callThresholdSystolic ?? "?"}/${carePlan.callThresholdDiastolic ?? "?"}.`,
    `Care team: ${patient.primaryClinicName}, ${patient.primaryClinicPhone}.`
  ].join("\n");
}

export function buildFoodLensInstructions(state: AppState, lens: ConditionLens): string {
  const language = state.patient.language === "es" ? "Spanish" : "English";
  const medGuidance = activeMedDietRules(state.medications, lens.medDietRules)
    .map((rule) => `- ${rule.modelGuidance}`)
    .join("\n");

  const sections = [
    "You are a warm, knowledgeable food coach speaking out loud with a patient who is holding food up to their phone camera.",
    "Keep each spoken answer to about three short sentences unless the patient asks for more. Use plain, sixth-grade language. Never diagnose or prescribe or tell the patient to change a medicine. Say numbers plainly.",
    `Speak ${language} by default. If the patient speaks another language, mirror it.`,
    "Some user messages are marked [camera context]. Those describe what the camera sees plus any label data — they are NOT the patient speaking. If there is no label data, estimate from the image and say clearly that it is an estimate.",
    `Condition focus:\n${lens.personaFocus}\nNutrient targets:\n${nutrientLimitLines(lens)}`,
    medGuidance ? `Medication-diet rules to follow:\n${medGuidance}` : "",
    `Better options: ${lens.betterOptionGuidance}`,
    `Patient card:\n${patientCard(state)}`
  ];

  return sections.filter((section) => section.length > 0).join("\n\n");
}

export function buildPerAskContext(food: IdentifiedFood | null, flags: FoodFlag[]): string {
  const foodData = food
    ? JSON.stringify({
        name: food.name,
        brand: food.brand,
        category: food.category,
        source: food.source,
        nutrition: food.nutrition
      })
    : JSON.stringify({ foodData: "none" });

  const flagLines = flags.length > 0 ? flags.map((flag) => `- ${flag.text}`).join("\n") : "- none";

  return [
    `Food data: ${foodData}`,
    `Precomputed flags:\n${flagLines}`,
    "Weave at most the top two flags into a natural spoken answer. Use the numbers above exactly; do not recompute them."
  ].join("\n");
}
