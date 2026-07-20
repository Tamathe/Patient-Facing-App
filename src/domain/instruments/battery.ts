export const TIER0_BATTERY = [
  "phq2",
  "gad2",
  "hunger_vital_sign",
  "tobacco_use",
  "nida_single"
] as const;

export type Tier0BatteryInstrumentId = (typeof TIER0_BATTERY)[number];
export type BatteryStep = Tier0BatteryInstrumentId | "phq9" | "gad7" | "done";

export function nextBatteryStep(
  completed: readonly string[],
  outcomes: Readonly<Record<string, string>>
): BatteryStep {
  const completedSet = new Set(completed);
  for (const instrumentId of TIER0_BATTERY) {
    if (!completedSet.has(instrumentId)) {
      return instrumentId;
    }
    if (instrumentId === "phq2" && outcomes.phq2 === "positive" && !completedSet.has("phq9")) {
      return "phq9";
    }
    if (instrumentId === "gad2" && outcomes.gad2 === "positive" && !completedSet.has("gad7")) {
      return "gad7";
    }
  }
  return "done";
}
