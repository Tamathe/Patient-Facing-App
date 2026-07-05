import { barrierLabel } from "./labels";
import type { AppState } from "./types";

// Builds a plain-text message the patient can copy or share with their care team.
// Everything comes from on-device state; nothing is sent anywhere by this function.
export function buildCareTeamMessage(state: AppState): string {
  const lines: string[] = ["For my care team:"];

  lines.push(`- What I am working on: ${state.carePlan.plainLanguageSummary}`);

  const recentReadings = state.readings
    .slice(-3)
    .reverse()
    .map((reading) => `${reading.systolic}/${reading.diastolic}`);
  if (recentReadings.length > 0) {
    lines.push(`- Recent home readings: ${recentReadings.join(", ")}`);
  }

  const medication = state.medications[0];
  if (medication) {
    const barriers = medication.activeBarriers.map(barrierLabel).join("; ");
    const barrierText = barriers.length > 0 ? ` What has been hard: ${barriers}.` : "";
    lines.push(`- Medicine: ${medication.name} ${medication.dose}, ${medication.schedule}.${barrierText}`);
  }

  lines.push("- My question: I want to talk about whether my plan is working and any side effects I am noticing.");

  return lines.join("\n");
}
