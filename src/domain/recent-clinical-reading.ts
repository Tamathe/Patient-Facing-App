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

type ClinicalReadingSeverity = "urgent" | "blocked";

export type FindRecentClinicalReadingOptions = {
  includeBlockedNotes?: boolean;
  referenceTime?: Date | string | number;
};

export function findRecentClinicalReading(
  readings: HomeReading[],
  carePlan: CarePlan,
  options: FindRecentClinicalReadingOptions = {}
): ClinicalReadingCandidate | undefined {
  const {
    includeBlockedNotes = false,
    referenceTime = new Date()
  } = options;
  const sortedReadings = sortReadingsByTime(readings);
  if (sortedReadings.length === 0) {
    return undefined;
  }

  const recentWindowStart = new Date(referenceTime).valueOf() - RECENT_READING_WINDOW_MS;
  const recentReadingsWindow = sortedReadings
    .filter((reading) => new Date(reading.measuredAt).valueOf() >= recentWindowStart)
    .slice()
    .reverse();
  let bestCandidate: (ClinicalReadingCandidate & { severity: ClinicalReadingSeverity }) | undefined;

  for (const reading of sortedReadings) {
    if (new Date(reading.measuredAt).valueOf() < recentWindowStart) {
      continue;
    }

    const bloodPressureInsight = interpretBloodPressure(reading, recentReadingsWindow, carePlan);
    const numericSafety = classifySafety(`${reading.systolic}/${reading.diastolic}`);
    const noteSafety = classifySafety(reading.note);
    const severity = getClinicalReadingSeverity({
      bloodPressureInsight,
      numericSafety,
      noteSafety,
      includeBlockedNotes
    });

    if (severity === undefined) {
      continue;
    }

    const candidate = {
      reading,
      bloodPressureInsight,
      noteSafety,
      numericSafety,
      severity
    };

    if (shouldReplaceCandidate(bestCandidate, candidate)) {
      bestCandidate = candidate;
    }
  }

  if (bestCandidate === undefined) {
    return undefined;
  }

  return {
    reading: bestCandidate.reading,
    bloodPressureInsight: bestCandidate.bloodPressureInsight,
    noteSafety: bestCandidate.noteSafety,
    numericSafety: bestCandidate.numericSafety
  };
}

function sortReadingsByTime(readings: HomeReading[]): HomeReading[] {
  return [...readings].sort(
    (left, right) => new Date(right.measuredAt).valueOf() - new Date(left.measuredAt).valueOf()
  );
}

function getClinicalReadingSeverity(params: {
  bloodPressureInsight: BloodPressureInsight;
  numericSafety: SafetyClassification;
  noteSafety: SafetyClassification;
  includeBlockedNotes: boolean;
}): ClinicalReadingSeverity | undefined {
  const isUrgent =
    params.numericSafety.level === "escalate" ||
    params.noteSafety.level === "escalate" ||
    params.bloodPressureInsight.escalation === "clinic";

  if (isUrgent) {
    return "urgent";
  }

  if (params.includeBlockedNotes && params.noteSafety.level === "blocked") {
    return "blocked";
  }

  return undefined;
}

function severityPriority(severity: ClinicalReadingSeverity): number {
  return severity === "urgent" ? 2 : 1;
}

function shouldReplaceCandidate(
  currentBest: (ClinicalReadingCandidate & { severity: ClinicalReadingSeverity }) | undefined,
  candidate: ClinicalReadingCandidate & { severity: ClinicalReadingSeverity }
): boolean {
  if (currentBest === undefined) {
    return true;
  }

  return severityPriority(candidate.severity) > severityPriority(currentBest.severity);
}
