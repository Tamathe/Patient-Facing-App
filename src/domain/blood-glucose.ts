import type { CarePlan, GlucoseReading } from "./types";

export type GlucoseInsight = {
  level: "track" | "recheck" | "call_clinic";
  message: string;
  escalation: "none" | "clinic";
  source: "care_plan" | "standard_education";
};

// Bidirectional glucose interpretation mirroring interpretBloodPressure. A
// care-plan call threshold (the emergency line) takes precedence; the standard
// low (<70) / high (>180) education bands only apply within the thresholds, so a
// plan with a low line of 54 still shows education for a 55-69 reading.
export function interpretGlucose(
  reading: GlucoseReading,
  recentReadings: GlucoseReading[],
  carePlan: CarePlan
): GlucoseInsight {
  const value = reading.valueMgDl;
  const low = carePlan.callThresholdGlucoseLow ?? null;
  const high = carePlan.callThresholdGlucoseHigh ?? null;

  if ((low !== null && value <= low) || (high !== null && value >= high)) {
    return {
      level: "call_clinic",
      message: "This reading meets the call threshold in your plan. Contact your care team and share this reading.",
      escalation: "clinic",
      source: "care_plan"
    };
  }

  if (value < 70) {
    return {
      level: "recheck",
      message:
        "This is general home blood-sugar education: a reading under 70 mg/dL is a common low-sugar warning. If you feel shaky, sweaty, or confused, treat a low now and recheck in 15 minutes.",
      escalation: "none",
      source: "standard_education"
    };
  }

  if (value > 180) {
    return {
      level: "recheck",
      message:
        "This is general home blood-sugar education: a reading above 180 mg/dL is above a common after-meal target. Drink water, keep logging, and bring the pattern to your care team.",
      escalation: "none",
      source: "standard_education"
    };
  }

  const hasRecentOutOfRange = recentReadings.slice(-3).some((item) => item.valueMgDl < 70 || item.valueMgDl > 180);

  return {
    level: "track",
    message: hasRecentOutOfRange
      ? "This reading is back in a common range after a recent out-of-range value. Keep logging so your care team can see the pattern."
      : "This reading is within a common range. Log another at your next planned time so your care team can review the trend.",
    escalation: "none",
    source: "standard_education"
  };
}
