import { activeConditions } from "./condition-lens";
import { classifyDiabetesMedication } from "./pdc-adherence";
import type { AppState, Medication } from "./types";

export function isDiabetesMedication(medication: Medication): boolean {
  return classifyDiabetesMedication(medication.name).status === "included";
}

// The medicine Home should feature, instead of blindly medications[0]. A med with
// an active barrier is the most actionable (e.g. Brent's metformin cost barrier);
// otherwise, for a diabetes plan, the first diabetes medicine; otherwise the
// first medicine. Keeps Home and the barrier task pointed at the same medicine.
export function pickFeaturedMedication(state: Pick<AppState, "medications" | "carePlan">): Medication | undefined {
  const { medications } = state;
  if (medications.length === 0) {
    return undefined;
  }

  const barrierMedication = medications.find((medication) => medication.activeBarriers.length > 0);
  if (barrierMedication) {
    return barrierMedication;
  }

  if (activeConditions(state.carePlan).includes("diabetes")) {
    const diabetesMedication = medications.find((medication) => isDiabetesMedication(medication));
    if (diabetesMedication) {
      return diabetesMedication;
    }
  }

  return medications[0];
}
