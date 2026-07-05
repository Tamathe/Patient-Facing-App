import { describe, expect, it } from "vitest";
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

describe("buildTodayTasks", () => {
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
