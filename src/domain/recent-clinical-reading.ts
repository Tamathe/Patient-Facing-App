import { interpretBloodPressure, type BloodPressureInsight } from "./blood-pressure";
import { interpretGlucose, type GlucoseInsight } from "./blood-glucose";
import type { CarePlan, GlucoseReading, HomeReading } from "./types";
import { classifySafety, type SafetyClassification } from "./safety";

export const RECENT_READING_WINDOW_MS = 24 * 60 * 60 * 1000;

const SEVERE_LOW_GLUCOSE = 54;

export type GlucoseReadingSeverity = "severe" | "clinic_threshold";

export type GlucoseReadingCandidate = {
  reading: GlucoseReading;
  glucoseInsight: GlucoseInsight;
  severity: GlucoseReadingSeverity;
};

// The stored-glucose analogue of findRecentClinicalReading. It classifies by the
// mg/dL VALUE (not a slash string), so a bare severe-low reading is never
// silenced by the glucose-cue gate on the free-text path. A value under 54 is a
// standalone emergency; a care-plan threshold breach is a clinic escalation.
export function findRecentGlucoseReading(
  glucoseReadings: GlucoseReading[],
  carePlan: CarePlan,
  options: { referenceTime?: Date | string | number } = {}
): GlucoseReadingCandidate | undefined {
  const { referenceTime = new Date() } = options;
  const recentWindowStart = new Date(referenceTime).valueOf() - RECENT_READING_WINDOW_MS;
  const windowReadings = [...glucoseReadings]
    .sort((left, right) => new Date(right.measuredAt).valueOf() - new Date(left.measuredAt).valueOf())
    .filter((reading) => new Date(reading.measuredAt).valueOf() >= recentWindowStart);
  const chronological = [...windowReadings].reverse();

  let best: GlucoseReadingCandidate | undefined;
  for (const reading of windowReadings) {
    const glucoseInsight = interpretGlucose(reading, chronological, carePlan);
    const severe = reading.valueMgDl < SEVERE_LOW_GLUCOSE;
    if (!severe && glucoseInsight.escalation !== "clinic") {
      continue;
    }
    const candidate: GlucoseReadingCandidate = {
      reading,
      glucoseInsight,
      severity: severe ? "severe" : "clinic_threshold"
    };
    if (best === undefined || glucoseSeverityPriority(candidate.severity) > glucoseSeverityPriority(best.severity)) {
      best = candidate;
    }
  }
  return best;
}

function glucoseSeverityPriority(severity: GlucoseReadingSeverity): number {
  return severity === "severe" ? 2 : 1;
}

export type ClinicalReadingCandidate = {
  reading: HomeReading;
  bloodPressureInsight: BloodPressureInsight;
  noteSafety: SafetyClassification;
  numericSafety: SafetyClassification;
};

type ClinicalReadingSeverity = "urgent_symptom" | "clinic_threshold" | "blocked";

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
    params.noteSafety.level === "escalate";

  if (isUrgent) {
    return "urgent_symptom";
  }

  if (params.numericSafety.level === "escalate" || params.bloodPressureInsight.escalation === "clinic") {
    return "clinic_threshold";
  }

  if (params.includeBlockedNotes && params.noteSafety.level === "blocked") {
    return "blocked";
  }

  return undefined;
}

function severityPriority(severity: ClinicalReadingSeverity): number {
  if (severity === "urgent_symptom") {
    return 3;
  }

  if (severity === "clinic_threshold") {
    return 2;
  }

  return 1;
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
