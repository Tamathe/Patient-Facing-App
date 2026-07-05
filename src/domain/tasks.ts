import type { AppState, TaskItem } from "./types";

export function buildTodayTasks(state: AppState): TaskItem[] {
  const tasks: TaskItem[] = [];

  if (state.readings.length === 0) {
    tasks.push({
      id: "task-bp-first",
      title: "Check blood pressure",
      body: "Log your first home reading so your plan can start building a pattern.",
      href: "/numbers",
      priority: 1,
      kind: "reading"
    });
  }

  if (state.medications.some((medication) => medication.activeBarriers.length > 0)) {
    tasks.push({
      id: "task-med-barrier",
      title: "Share what got in the way",
      body: "Your medicine list has a barrier marked. Turn it into a clear question for your care team.",
      href: "/chat",
      priority: 1,
      kind: "medicine"
    });
  } else {
    tasks.push({
      id: "task-med-purpose",
      title: "Review why your medicine matters",
      body: "A quick explanation can make daily medicine feel less random.",
      href: "/medicines",
      priority: 2,
      kind: "medicine"
    });
  }

  tasks.push({
    id: "task-visit-brief",
    title: "Prepare for your next visit",
    body: state.carePlan.nextVisitReason,
    href: "/visits",
    priority: 3,
    kind: "visit"
  });

  return tasks.sort((left, right) => left.priority - right.priority).slice(0, 3);
}
