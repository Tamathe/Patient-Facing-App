import type { AppState, HomeReading, TaskItem } from "./types";
import { classifySafety } from "./safety";
import { interpretBloodPressure, type BloodPressureInsight } from "./blood-pressure";

const RECENT_READING_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_TODAY_TASKS = 3;

type ClinicalReadingCandidate = {
  reading: HomeReading;
  bloodPressureInsight: BloodPressureInsight;
};

export function buildTodayTasks(state: AppState): TaskItem[] {
  const tasks: TaskItem[] = [];
  const recentClinicalReading = getRecentClinicalReading(state.readings, state.carePlan);

  if (recentClinicalReading !== undefined) {
    const isCarePlanThreshold = recentClinicalReading.bloodPressureInsight.source === "care_plan";
    const isClinicianThreshold = isCarePlanThreshold && state.carePlan.thresholdSource === "clinician_authored";

    tasks.push({
      id: "task-bp-clinical",
      title: "Share this reading with your care team",
      body: isCarePlanThreshold
        ? isClinicianThreshold
          ? "This met a threshold in your clinician-authored care plan. Share this reading today."
          : "This met a standard-home blood pressure threshold. Share this reading and check with your care team."
        : "This reading suggests a same-day review with your care team.",
      href: "/chat",
      priority: 1,
      kind: "reading",
      status: isCarePlanThreshold ? (isClinicianThreshold ? "confirmed" : "inferred") : "needs_review"
    });
  } else if (state.readings.length === 0) {
    tasks.push({
      id: "task-bp-first",
      title: "Check blood pressure",
      body: "Log your first home reading so your plan can start building a pattern.",
      href: "/numbers",
      priority: 1,
      kind: "reading",
      status: "needs_review"
    });
  }

  if (state.medications.length > 0 && state.medications.some((medication) => medication.activeBarriers.length > 0)) {
    tasks.push({
      id: "task-med-barrier",
      title: "Share what got in the way",
      body: "Your medicine list has a barrier marked. Turn it into a clear question for your care team.",
      href: "/chat",
      priority: 2,
      kind: "medicine",
      status: "confirmed"
    });
  } else if (state.medications.length > 0) {
    tasks.push({
      id: "task-med-purpose",
      title: "Review why your medicine matters",
      body: "A quick explanation can make daily medicine feel less random.",
      href: "/medicines",
      priority: 2,
      kind: "medicine",
      status: "inferred"
    });
  }

  const visitReason = state.carePlan.nextVisitReason.trim();
  if (visitReason.length > 0) {
    tasks.push({
      id: "task-visit-brief",
      title: "Prepare for your next visit",
      body: visitReason,
      href: "/visits",
      priority: 3,
      kind: "visit",
      status: "confirmed"
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      id: "task-today-safe-state",
      title: "No urgent items to review today",
      body: "You have no urgent home signals right now. Keep logging your blood pressure on your normal schedule.",
      href: "/numbers",
      priority: 3,
      kind: "reading",
      status: "inferred"
    });
  }

  return tasks.sort((left, right) => left.priority - right.priority).slice(0, MAX_TODAY_TASKS);
}

function getRecentClinicalReading(readings: HomeReading[], carePlan: AppState["carePlan"]): ClinicalReadingCandidate | undefined {
  const sortedReadings = sortReadingsByTime(readings);
  const recentWindowStart = Date.now() - RECENT_READING_WINDOW_MS;

  for (const reading of sortedReadings) {
    const readingTime = new Date(reading.measuredAt).valueOf();
    if (readingTime < recentWindowStart) {
      continue;
    }

    const bloodPressureInsight = interpretBloodPressure(reading, sortedReadings, carePlan);
    const requiresClinicalFollowUp =
      latestReadingNeedsClinicCheck(reading) || bloodPressureInsight.escalation === "clinic";

    if (!requiresClinicalFollowUp) {
      continue;
    }

    return { reading, bloodPressureInsight };
  }

  return undefined;
}

function sortReadingsByTime(readings: HomeReading[]): HomeReading[] {
  return [...readings].sort(
    (left, right) => new Date(right.measuredAt).valueOf() - new Date(left.measuredAt).valueOf()
  );
}

function latestReadingNeedsClinicCheck(reading: HomeReading): boolean {
  const numericSafety = `${reading.systolic}/${reading.diastolic}`;
  const safetyAssessment = classifySafety(numericSafety);

  if (safetyAssessment.level === "escalate") {
    return true;
  }

  if (reading.note) {
    return classifySafety(reading.note).level === "escalate";
  }

  return false;
}
