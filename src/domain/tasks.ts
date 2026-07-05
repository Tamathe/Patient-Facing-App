import type { AppState, HomeReading, TaskItem } from "./types";
import { classifySafety } from "./safety";
import { interpretBloodPressure } from "./blood-pressure";

export function buildTodayTasks(state: AppState): TaskItem[] {
  const tasks: TaskItem[] = [];
  const latestReading = getLatestReading(state.readings);
  const readingRequiresClinicalFollowUp =
    latestReading !== undefined &&
    (latestReadingNeedsClinicCheck(latestReading, state) ||
      interpretBloodPressure(latestReading, state.readings, state.carePlan).escalation === "clinic");

  if (readingRequiresClinicalFollowUp) {
    tasks.push({
      id: "task-bp-clinical",
      title: "Share this reading with your care team",
      body: "Your latest reading is in the range to review today. If you feel worse, call your care team now.",
      href: "/chat",
      priority: 1,
      kind: "reading"
    });
  } else if (state.readings.length === 0) {
    tasks.push({
      id: "task-bp-first",
      title: "Check blood pressure",
      body: "Log your first home reading so your plan can start building a pattern.",
      href: "/numbers",
      priority: 1,
      kind: "reading"
    });
  }

  if (state.medications.length > 0 && state.medications.some((medication) => medication.activeBarriers.length > 0)) {
    tasks.push({
      id: "task-med-barrier",
      title: "Share what got in the way",
      body: "Your medicine list has a barrier marked. Turn it into a clear question for your care team.",
      href: "/chat",
      priority: 2,
      kind: "medicine"
    });
  } else if (state.medications.length > 0) {
    tasks.push({
      id: "task-med-purpose",
      title: "Review why your medicine matters",
      body: "A quick explanation can make daily medicine feel less random.",
      href: "/medicines",
      priority: 2,
      kind: "medicine"
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
      kind: "visit"
    });
  }

  return tasks.sort((left, right) => left.priority - right.priority).slice(0, 3);
}

function getLatestReading(readings: HomeReading[]): HomeReading | undefined {
  if (readings.length === 0) {
    return undefined;
  }

  return [...readings].sort(
    (left, right) => new Date(right.measuredAt).valueOf() - new Date(left.measuredAt).valueOf()
  )[0];
}

function latestReadingNeedsClinicCheck(reading: HomeReading, state: AppState): boolean {
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
