import type { AppState, HomeReading, TaskItem } from "./types";
import { findRecentClinicalReading, type ClinicalReadingCandidate } from "./recent-clinical-reading";
import { getSiteById } from "./screening-sites";
import { tHome } from "@/i18n/home-strings";

const MAX_TODAY_TASKS = 3;
const CHECKIN_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

function isCheckinDue(state: AppState): boolean {
  const phq9Events = state.assessmentEvents.filter(({ instrumentId }) => instrumentId === "phq9");
  if (phq9Events.length === 0) {
    return true;
  }
  const latest = [...phq9Events].sort(
    (left, right) => new Date(right.recordedAt).valueOf() - new Date(left.recordedAt).valueOf()
  )[0];
  return Date.now() - new Date(latest.recordedAt).valueOf() > CHECKIN_INTERVAL_MS;
}

export function buildTodayTasks(state: AppState): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lang = state.patient.language;
  const recentClinicalReading = getRecentClinicalReading(state.readings, state.carePlan);

  if (recentClinicalReading !== undefined) {
    const isCarePlanThreshold = recentClinicalReading.bloodPressureInsight.source === "care_plan";
    const isClinicianThreshold = isCarePlanThreshold && state.carePlan.thresholdSource === "clinician_authored";
    const isUrgentSymptom = recentClinicalReading.noteSafety.level === "escalate";
    const isBlockedNote = recentClinicalReading.noteSafety.level === "blocked";

    tasks.push({
      id: "task-bp-clinical",
      title: isUrgentSymptom
        ? tHome(lang, "taskBpClinicalUrgentTitle")
        : isBlockedNote
          ? tHome(lang, "taskBpClinicalBlockedTitle")
          : tHome(lang, "taskBpClinicalShareTitle"),
      body: isUrgentSymptom
        ? recentClinicalReading.noteSafety.response
        : isBlockedNote
          ? tHome(lang, "taskBpClinicalBlockedBody")
        : isCarePlanThreshold
          ? isClinicianThreshold
            ? tHome(lang, "taskBpClinicalClinicianBody")
            : tHome(lang, "taskBpClinicalStandardBody")
          : tHome(lang, "taskBpClinicalSameDayBody"),
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
      title: tHome(lang, "taskBpFirstTitle"),
      body: tHome(lang, "taskBpFirstBody"),
      href: "/numbers",
      priority: 1,
      kind: "reading",
      status: "needs_review"
    });
  }

  if (state.medications.length > 0 && state.medications.some((medication) => medication.activeBarriers.length > 0)) {
    tasks.push({
      id: "task-med-barrier",
      title: tHome(lang, "taskMedBarrierTitle"),
      body: tHome(lang, "taskMedBarrierBody"),
      href: "/chat",
      priority: 2,
      kind: "medicine",
      status: "confirmed"
    });
  } else if (state.medications.length > 0) {
    tasks.push({
      id: "task-med-purpose",
      title: tHome(lang, "taskMedPurposeTitle"),
      body: tHome(lang, "taskMedPurposeBody"),
      href: "/medicines",
      priority: 2,
      kind: "medicine",
      status: "inferred"
    });
  }

  // A recall due within 60 days surfaces quietly — a suggestion, not an alarm.
  const RECALL_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
  const dueRecall = state.recallReminders.find(
    (reminder) => new Date(reminder.dueAt).valueOf() - Date.now() <= RECALL_WINDOW_MS
  );
  const hasOpenScreeningWork = state.screeningGaps.some(
    (gap) => gap.status === "overdue" || gap.status === "engaged" || gap.status === "scheduled" || gap.status === "repeat"
  );
  if (dueRecall && !hasOpenScreeningWork) {
    const monthYear = new Date(dueRecall.dueAt).toLocaleDateString(lang === "es" ? "es-US" : "en-US", {
      month: "long",
      year: "numeric"
    });
    tasks.push({
      id: "task-screening-recall",
      title: tHome(lang, "taskRecallTitle"),
      body: tHome(lang, "taskRecallBody", { monthYear }),
      href: "/screening",
      priority: 3,
      kind: "visit",
      status: "inferred"
    });
  }

  // A booked eye screening shows up as a confirmed appointment chip until the
  // result comes back (the gap machine owns that lifecycle).
  const scheduledScreening = state.screeningGaps.find((gap) => gap.status === "scheduled");
  if (scheduledScreening?.scheduledSiteId && scheduledScreening.scheduledFor) {
    const siteName = getSiteById(scheduledScreening.scheduledSiteId)?.name ?? scheduledScreening.scheduledSiteId;
    tasks.push({
      id: "task-screening-booked",
      title: tHome(lang, "taskScreeningBookedTitle", { site: siteName, when: scheduledScreening.scheduledFor }),
      body: tHome(lang, "taskScreeningBookedBody"),
      href: "/screening",
      priority: 2,
      kind: "visit",
      status: "confirmed"
    });
  }

  if (isCheckinDue(state)) {
    tasks.push({
      id: "task-checkin",
      title: tHome(lang, "taskCheckinTitle"),
      body: tHome(lang, "taskCheckinBody"),
      href: "/checkin/phq9",
      priority: 2,
      kind: "checkin",
      status: "inferred"
    });
  }

  const visitReason = state.carePlan.nextVisitReason.trim();
  if (visitReason.length > 0) {
    tasks.push({
      id: "task-visit-brief",
      title: tHome(lang, "taskVisitTitle"),
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
      title: tHome(lang, "taskSafeStateTitle"),
      body: tHome(lang, "taskSafeStateBody"),
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
