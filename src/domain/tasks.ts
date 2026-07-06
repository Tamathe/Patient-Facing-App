import type { AppState, HomeReading, TaskItem } from "./types";
import { findRecentClinicalReading, type ClinicalReadingCandidate } from "./recent-clinical-reading";

const MAX_TODAY_TASKS = 3;
const CHECKIN_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

function isCheckinDue(state: AppState): boolean {
  if (state.assessmentEvents.length === 0) {
    return true;
  }
  const latest = [...state.assessmentEvents].sort(
    (left, right) => new Date(right.recordedAt).valueOf() - new Date(left.recordedAt).valueOf()
  )[0];
  return Date.now() - new Date(latest.recordedAt).valueOf() > CHECKIN_INTERVAL_MS;
}

export function buildTodayTasks(state: AppState): TaskItem[] {
  const tasks: TaskItem[] = [];
  const recentClinicalReading = getRecentClinicalReading(state.readings, state.carePlan);

  if (recentClinicalReading !== undefined) {
    const isCarePlanThreshold = recentClinicalReading.bloodPressureInsight.source === "care_plan";
    const isClinicianThreshold = isCarePlanThreshold && state.carePlan.thresholdSource === "clinician_authored";
    const isUrgentSymptom = recentClinicalReading.noteSafety.level === "escalate";
    const isBlockedNote = recentClinicalReading.noteSafety.level === "blocked";

    tasks.push({
      id: "task-bp-clinical",
      title: isUrgentSymptom
        ? "Seek urgent help now"
        : isBlockedNote
          ? "Review this note with your care team"
          : "Share this reading with your care team",
      body: isUrgentSymptom
        ? recentClinicalReading.noteSafety.response
        : isBlockedNote
          ? "You mentioned a medication change in this reading. Message your care team before making any medication adjustments."
        : isCarePlanThreshold
          ? isClinicianThreshold
            ? "This met a threshold in your clinician-authored care plan. Share this reading today."
            : "This met a standard-home blood pressure threshold. Share this reading and check with your care team."
          : "This reading suggests a same-day review with your care team.",
      href: "/chat",
      priority: 1,
      kind: "reading",
      status: isUrgentSymptom
        ? "needs_review"
        : isBlockedNote
          ? "needs_review"
          : isCarePlanThreshold
            ? (isClinicianThreshold ? "confirmed" : "inferred")
            : "needs_review"
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

  if (isCheckinDue(state)) {
    tasks.push({
      id: "task-checkin",
      title: "Take a quick mood check-in",
      body: "A short, private check-in about how you have been feeling. It is optional and takes about a minute.",
      href: "/checkin",
      priority: 2,
      kind: "checkin",
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
  return findRecentClinicalReading(readings, carePlan, { includeBlockedNotes: true });
}
