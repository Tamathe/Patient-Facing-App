import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "./fixtures";
import { buildTodayTasks } from "./tasks";
import type { AssessmentEvent } from "./assessment";
import type { HomeReading } from "./types";

const NOW = new Date("2026-07-05T12:00:00.000Z");

// A recent check-in keeps the periodic nudge from being due, so tests that
// isolate reading-window behavior are not confounded by the check-in task.
const recentCheckin: AssessmentEvent[] = [
  {
    id: "assessment-recent",
    patientId: "patient-1",
    instrumentId: "phq9",
    itemResponses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    totalScore: 0,
    severityBand: "minimal",
    status: "patient_reported",
    recordedAt: "2026-07-04T12:00:00.000Z"
  }
];

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

const chestPainReading: HomeReading = {
  id: "chest-pain-reading",
  patientId: "patient-1",
  systolic: 128,
  diastolic: 82,
  pulse: 78,
  measuredAt: "2026-07-05T10:30:00.000Z",
  contexts: ["morning"],
  note: "I had chest pain for 5 minutes."
};

const medicationChangeReading: HomeReading = {
  id: "medication-change-reading",
  patientId: "patient-1",
  systolic: 126,
  diastolic: 80,
  pulse: 74,
  measuredAt: "2026-07-05T10:45:00.000Z",
  contexts: ["morning"],
  note: "Should I increase my dose?"
};

describe("buildTodayTasks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("limits Today to three priority items", () => {
    const tasks = buildTodayTasks(demoState);

    expect(tasks.length).toBeLessThanOrEqual(3);
  });

  it("prioritizes blood pressure logging when no readings exist", () => {
    const tasks = buildTodayTasks({ ...demoState, readings: [] });

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
    const tasks = buildTodayTasks({
      ...demoState,
      assessmentEvents: recentCheckin,
      medications: [],
      carePlan: {
        ...demoState.carePlan,
        nextVisitReason: ""
      },
      readings: [
        routineReading,
        {
          ...dangerousReading,
          measuredAt: "2026-07-01T10:00:00.000Z"
        }
      ]
    });

    expect(tasks[0]).toMatchObject({
      id: "task-today-safe-state",
      title: "No urgent items to review today"
    });
  });

  it("does not surface stale urgent or blocked readings outside the real-time 24-hour window", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      assessmentEvents: recentCheckin,
      medications: [],
      carePlan: {
        ...demoState.carePlan,
        nextVisitReason: ""
      },
      readings: [
        {
          ...dangerousReading,
          measuredAt: "2026-07-03T10:00:00.000Z",
          id: "dangerous-older-reading"
        },
        {
          ...medicationChangeReading,
          measuredAt: "2026-07-03T09:00:00.000Z",
          id: "blocked-older-reading"
        }
      ]
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "task-today-safe-state",
      title: "No urgent items to review today"
    });
  });

  it("does not let an outdated high reading influence Today interpretation of a normal recent reading", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      assessmentEvents: recentCheckin,
      medications: [],
      carePlan: {
        ...demoState.carePlan,
        nextVisitReason: ""
      },
      readings: [
        {
          ...routineReading,
          measuredAt: "2026-07-05T11:00:00.000Z"
        },
        {
          ...dangerousReading,
          measuredAt: "2026-07-01T10:00:00.000Z",
          id: "dangerous-older-reading"
        }
      ]
    });

    expect(tasks.map((task) => task.id)).not.toContain("task-bp-clinical");
    expect(tasks[0]).toMatchObject({
      id: "task-today-safe-state",
      title: "No urgent items to review today"
    });
  });

  it("keeps blocked-note Today task behavior when stale out-of-window highs are present", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [
        medicationChangeReading,
        {
          ...dangerousReading,
          measuredAt: "2026-07-01T10:00:00.000Z"
        }
      ]
    });

    expect(tasks[0]).toMatchObject({
      id: "task-bp-clinical",
      title: "Review this note with your care team",
      status: "needs_review",
      href: "/chat"
    });
    expect(tasks[0].body).toContain("medication change");
  });

  it("creates an urgent-help task when a recent earlier reading reports chest pain", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [routineReading, chestPainReading]
    });

    expect(tasks[0]).toMatchObject({
      title: "Seek urgent help now",
      href: "/chat",
      status: "needs_review"
    });
    expect(tasks[0].body).toContain("If this may be an emergency");
  });

  it("uses urgent symptom/clinic follow-up even when a newer blocked note exists", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [medicationChangeReading, chestPainReading]
    });

    expect(tasks[0]).toMatchObject({
      id: "task-bp-clinical",
      title: "Seek urgent help now",
      status: "needs_review",
      href: "/chat"
    });
  });

  it("uses urgent symptom escalations over newer threshold follow-ups", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [
        {
          ...thresholdReading,
          id: "threshold-reading-newer",
          measuredAt: "2026-07-05T11:00:00.000Z"
        },
        chestPainReading
      ]
    });

    expect(tasks[0]).toMatchObject({
      id: "task-bp-clinical",
      title: "Seek urgent help now",
      status: "needs_review",
      href: "/chat"
    });
    expect(tasks[0].body).toContain("If this may be an emergency");
  });

  it("adds a blocked-note review task with needs_review when that is the highest-severity issue", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [routineReading, medicationChangeReading]
    });

    expect(tasks[0]).toMatchObject({
      id: "task-bp-clinical",
      title: "Review this note with your care team",
      status: "needs_review",
      href: "/chat"
    });
    expect(tasks[0].body).toContain("medication change");
  });

  it("adds a safe fallback when no immediate tasks exist", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      assessmentEvents: recentCheckin,
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

  it("adds a check-in nudge when no recent check-in exists", () => {
    const tasks = buildTodayTasks({ ...demoState, readings: [] });

    expect(tasks.some((task) => task.kind === "checkin")).toBe(true);
  });

  it("does not add a check-in nudge when one was recorded recently", () => {
    const tasks = buildTodayTasks({ ...demoState, assessmentEvents: recentCheckin });

    expect(tasks.some((task) => task.kind === "checkin")).toBe(false);
  });

  it("keeps the priority-1 clinical task in the top three when a check-in nudge competes (FR-14)", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      readings: [dangerousReading],
      medications: [{ ...demoState.medications[0], activeBarriers: ["cost"] }]
    });

    expect(tasks).toHaveLength(3);
    expect(tasks[0].priority).toBe(1);
    expect(tasks.map((task) => task.id)).toContain("task-bp-clinical");
    expect(tasks.some((task) => task.kind === "checkin")).toBe(true);
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

  it("localizes task copy for a Spanish patient", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      patient: { ...demoState.patient, language: "es" },
      readings: [],
      medications: [],
      assessmentEvents: recentCheckin,
      carePlan: { ...demoState.carePlan, nextVisitReason: "" }
    });

    expect(tasks.map((task) => task.title)).toContain("Toma tu presión arterial");
  });

  it("shows a booked eye screening as a confirmed appointment chip", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      assessmentEvents: recentCheckin,
      screeningGaps: [
        {
          ...demoState.screeningGaps[0],
          status: "scheduled",
          scheduledSiteId: "site_fqhc_mobile",
          scheduledFor: "Tuesday 2:40 PM"
        }
      ]
    });

    const chip = tasks.find((task) => task.id === "task-screening-booked");
    expect(chip).toBeDefined();
    expect(chip?.title).toBe("Eye screening — Perry County FQHC Mobile Camera, Tuesday 2:40 PM");
    expect(chip?.status).toBe("confirmed");
  });

  it("surfaces a quiet recall chip when the annual rescreen is due within 60 days", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      assessmentEvents: recentCheckin,
      screeningGaps: [{ ...demoState.screeningGaps[0], status: "closed" }],
      recallReminders: [{ id: "recall-1", dueAt: "2026-08-04T12:00:00.000Z", reason: "annual_rescreen" }]
    });

    const chip = tasks.find((task) => task.id === "task-screening-recall");
    expect(chip).toBeDefined();
    expect(chip?.status).toBe("inferred");
    expect(chip?.body).toContain("August 2026");
  });

  it("stays quiet about a recall that is still far away", () => {
    const tasks = buildTodayTasks({
      ...demoState,
      assessmentEvents: recentCheckin,
      screeningGaps: [{ ...demoState.screeningGaps[0], status: "closed" }],
      recallReminders: [{ id: "recall-1", dueAt: "2027-07-05T12:00:00.000Z", reason: "annual_rescreen" }]
    });

    expect(tasks.find((task) => task.id === "task-screening-recall")).toBeUndefined();
  });
});
