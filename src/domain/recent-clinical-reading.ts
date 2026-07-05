import { interpretBloodPressure, type BloodPressureInsight } from "./blood-pressure";
import type { CarePlan, HomeReading } from "./types";
import { classifySafety, type SafetyClassification } from "./safety";

export const RECENT_READING_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ClinicalReadingCandidate = {
  reading: HomeReading;
  bloodPressureInsight: BloodPressureInsight;
  noteSafety: SafetyClassification;
  numericSafety: SafetyClassification;
};

export function findRecentClinicalReading(
  readings: HomeReading[],
  carePlan: CarePlan
): ClinicalReadingCandidate | undefined {
  const sortedReadings = sortReadingsByTime(readings);
  if (sortedReadings.length === 0) {
    return undefined;
  }

  const recentWindowStart = new Date(sortedReadings[0].measuredAt).valueOf() - RECENT_READING_WINDOW_MS;

  for (const reading of sortedReadings) {
    if (new Date(reading.measuredAt).valueOf() < recentWindowStart) {
      continue;
    }

    const bloodPressureInsight = interpretBloodPressure(reading, sortedReadings, carePlan);
    const numericSafety = classifySafety(`${reading.systolic}/${reading.diastolic}`);
    const noteSafety = classifySafety(reading.note);

    const requiresClinicalFollowUp =
      numericSafety.level === "escalate" ||
      noteSafety.level === "escalate" ||
      bloodPressureInsight.escalation === "clinic";

    if (!requiresClinicalFollowUp) {
      continue;
    }

    return {
      reading,
      bloodPressureInsight,
      noteSafety,
      numericSafety
    };
  }

  return undefined;
}

function sortReadingsByTime(readings: HomeReading[]): HomeReading[] {
  return [...readings].sort(
    (left, right) => new Date(right.measuredAt).valueOf() - new Date(left.measuredAt).valueOf()
  );
}

