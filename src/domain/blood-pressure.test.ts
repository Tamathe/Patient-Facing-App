import { describe, expect, it } from "vitest";
import { interpretBloodPressure } from "./blood-pressure";
import { demoState } from "./fixtures";
import type { HomeReading } from "./types";

const baseReading: HomeReading = {
  id: "reading-1",
  patientId: "patient-1",
  systolic: 151,
  diastolic: 92,
  pulse: 72,
  measuredAt: "2026-07-05T09:00:00.000Z",
  contexts: ["morning"],
  note: ""
};

describe("interpretBloodPressure", () => {
  it("recommends recheck when a reading is high but below call threshold", () => {
    const result = interpretBloodPressure(baseReading, [], demoState.carePlan);

    expect(result.level).toBe("recheck");
    expect(result.message).toContain("Rest quietly for 5 minutes");
    expect(result.escalation).toBe("none");
  });

  it("routes to care team when a plan threshold is met", () => {
    const result = interpretBloodPressure(
      { ...baseReading, systolic: 164, diastolic: 101 },
      [],
      demoState.carePlan
    );

    expect(result.level).toBe("call_clinic");
    expect(result.escalation).toBe("clinic");
  });

  it("labels a lower reading as within the current tracked pattern", () => {
    const result = interpretBloodPressure(
      { ...baseReading, systolic: 124, diastolic: 78 },
      [],
      demoState.carePlan
    );

    expect(result.level).toBe("track");
    expect(result.message).toContain("Log another reading");
  });
});
