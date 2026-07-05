import type { CarePlan, HomeReading } from "./types";

export type BloodPressureInsight = {
  level: "track" | "recheck" | "call_clinic";
  message: string;
  escalation: "none" | "clinic";
  source: "care_plan" | "standard_education";
};

export function interpretBloodPressure(reading: HomeReading, recentReadings: HomeReading[], carePlan: CarePlan): BloodPressureInsight {
  const thresholdMet =
    (carePlan.callThresholdSystolic !== null && reading.systolic >= carePlan.callThresholdSystolic) ||
    (carePlan.callThresholdDiastolic !== null && reading.diastolic >= carePlan.callThresholdDiastolic);

  if (thresholdMet) {
    return {
      level: "call_clinic",
      message: "This reading meets the call threshold in your plan. Contact your care team and share this reading.",
      escalation: "clinic",
      source: "care_plan"
    };
  }

  if (reading.systolic >= 140 || reading.diastolic >= 90) {
    return {
      level: "recheck",
      message:
        "This is general home blood pressure education: a reading above 140/90 is above the common home target. Rest quietly for 5 minutes with both feet on the floor, then recheck and log the next reading.",
      escalation: "none",
      source: "standard_education"
    };
  }

  const hasRecentHigh = recentReadings.slice(-3).some((item) => item.systolic >= 140 || item.diastolic >= 90);

  return {
    level: "track",
    message: hasRecentHigh
      ? "This reading is lower than a recent high reading. Log another reading at your next planned time so your care team can see the pattern."
      : "This reading is within the current tracked pattern. Log another reading at your next planned time so your care team can review the trend.",
    escalation: "none",
    source: "standard_education"
  };
}
