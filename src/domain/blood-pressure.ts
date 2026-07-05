import type { CarePlan, HomeReading } from "./types";

export type BloodPressureInsight = {
  level: "track" | "recheck" | "call_clinic";
  message: string;
  escalation: "none" | "clinic";
};

export function interpretBloodPressure(reading: HomeReading, recentReadings: HomeReading[], carePlan: CarePlan): BloodPressureInsight {
  const thresholdMet =
    (carePlan.callThresholdSystolic !== null && reading.systolic >= carePlan.callThresholdSystolic) ||
    (carePlan.callThresholdDiastolic !== null && reading.diastolic >= carePlan.callThresholdDiastolic);

  if (thresholdMet) {
    return {
      level: "call_clinic",
      message: `This reading meets the call threshold in your plan. Contact ${carePlan.patientId === "patient-1" ? "your clinic" : "your care team"} and share this reading.`,
      escalation: "clinic"
    };
  }

  if (reading.systolic >= 140 || reading.diastolic >= 90) {
    return {
      level: "recheck",
      message:
        "This reading is higher than the usual home goal range. Rest quietly for 5 minutes with both feet on the floor, then recheck and log the next reading.",
      escalation: "none"
    };
  }

  const hasRecentHigh = recentReadings.slice(-3).some((item) => item.systolic >= 140 || item.diastolic >= 90);

  return {
    level: "track",
    message: hasRecentHigh
      ? "This reading is lower than a recent high reading. Log another reading at your next planned time so your care team can see the pattern."
      : "This reading is within the current tracked pattern. Keep logging readings so your care team can review the trend.",
    escalation: "none"
  };
}
