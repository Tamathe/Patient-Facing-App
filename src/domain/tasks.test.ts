import { afterEach, describe, expect, it, vi } from "vitest";
import { demoState } from "./fixtures";
import { buildTodayTasks } from "./tasks";
import type { HomeReading } from "./types";

const dangerousReading: HomeReading = {
  id: "danger-reading",
  patientId: "patient-1",
  systolic: 200,
  diastolic: 120,
  pulse: 72,
  measuredAt: "2026-07-05T10:00:00.000Z",
  contexts: ["morning"],
  note: ""
};

const thresholdReading: HomeReading = {
  id: "threshold-reading",
  patientId: "patient-1",
  systolic: 165,
  diastolic: 102,
  pulse: 70,
  measuredAt: "2026-07-05T10:00:00.000Z",
  contexts: ["morning"],
  note: ""
};

const routineReading: HomeReading = {
  id: "routine-reading",
  patientId: "patient-1",
  systolic: 128,
  diastolic: 82,
  pulse: 72,
  measuredAt: "2026-07-05T11:00:00.000Z",
  contexts: ["morning"],
  note: ""
};

describe("buildTodayTasks", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("limits Today to three priority items", () => {
    const tasks = buildTodayTasks(demoState);

    expect(tasks.length).toBeLessThanOrEqual(3);
  });

  it("prioritizes blood pressure logging when no readings exist", () => {
    const tasks = buildTodayTasks(demoState);

    expect(tasks[0]).toMatchObject({
      title: "Check blood pressure",
      href: "/numbers"
    });
  });

  it("prioritizes urgent blood pressure follow-up when latest reading needs clinical attention", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [dangerousReading]
    });

    expect(tasks[0]).toMatchObject({
      title: "Share this reading with your care team",
      kind: "reading"
    });
    expect(tasks[0]).toMatchObject({ href: "/chat" });
  });

  it("labels urgent threshold follow-up as clinician-authored when care-plan thresholds are clinician-authored", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [thresholdReading]
    });

    expect(tasks[0]).toMatchObject({
      title: "Share this reading with your care team",
      href: "/chat",
      status: "confirmed"
    });
    expect(tasks[0].body).toContain("clinician-authored care plan");
  });

  it("labels urgent threshold follow-up as educational when threshold source is standard education", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      carePlan: {
        ...demoState.carePlan,
        thresholdSource: "standard_education"
      },
      readings: [thresholdReading]
    });

    expect(tasks[0]).toMatchObject({
      title: "Share this reading with your care team",
      href: "/chat",
      status: "inferred"
    });
    expect(tasks[0].body).toContain("standard-home blood pressure threshold");
  });

  it("keeps a recent dangerous reading visible when a later routine reading exists", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const tasks = buildTodayTasks({
      ...demoState,
      readings: [routineReading, dangerousReading]
    });

    expect(tasks[0]).toMatchObject({
      id: "task-bp-clinical",
      title: "Share this reading with your care team",
      href: "/chat",
      status: "confirmed"
    });
  });

  it("does not surface outdated readings outside the recent-reading window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const tasks = buildTodayTasks({
      ...demoState,
      medications: [],
      carePlan: {
        ...demoState.carePlan,
        nextVisitReason: ""
      },
      readings: [
        {
          ...dangerousReading,
          measuredAt: "2026-07-03T10:00:00.000Z"
        }
      ]
    });

    expect(tasks[0]).toMatchObject({
      id: "task-today-safe-state",
      title: "No urgent items to review today"
    });
  });

  it("adds a safe fallback when no immediate tasks exist", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      medications: [],
      carePlan: {
        ...demoState.carePlan,
        nextVisitReason: ""
      },
      readings: [
        {
          ...routineReading,
          id: "routine-legacy-reading"
        }
      ]
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "task-today-safe-state",
      title: "No urgent items to review today"
    });
  });

  it("does not add a medicine task when medications are empty", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      medications: []
    });

    expect(tasks.map((task) => task.kind)).not.toContain("medicine");
  });

  it("does not add a visit task with a blank reason", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      carePlan: {
        ...demoState.carePlan,
        nextVisitReason: ""
      }
    });

    expect(tasks.map((task) => task.kind)).not.toContain("visit");
  });
});
