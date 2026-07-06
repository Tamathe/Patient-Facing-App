import { describe, expect, it } from "vitest";
import { interpretGlucose } from "./blood-glucose";
import { brentState, demoState } from "./fixtures";
import type { GlucoseReading } from "./types";

function gReading(valueMgDl: number): GlucoseReading {
  return {
    id: `g-${valueMgDl}`,
    patientId: "patient-brent",
    valueMgDl,
    measuredAt: "2026-07-04T07:00:00.000Z",
    contexts: ["morning"],
    note: ""
  };
}

describe("interpretGlucose", () => {
  const brentPlan = brentState.carePlan; // low 54, high 300
  const noThresholdPlan = demoState.carePlan; // no glucose thresholds

  it("calls the clinic when a severe low meets the care-plan threshold", () => {
    const insight = interpretGlucose(gReading(45), [], brentPlan);
    expect(insight.level).toBe("call_clinic");
    expect(insight.escalation).toBe("clinic");
    expect(insight.source).toBe("care_plan");
  });

  it("calls the clinic when a high reading meets the care-plan threshold", () => {
    const insight = interpretGlucose(gReading(320), [], brentPlan);
    expect(insight.level).toBe("call_clinic");
    expect(insight.escalation).toBe("clinic");
  });

  it("shows low education between the care-plan threshold and 70", () => {
    const insight = interpretGlucose(gReading(60), [], brentPlan);
    expect(insight.level).toBe("recheck");
    expect(insight.escalation).toBe("none");
    expect(insight.source).toBe("standard_education");
  });

  it("shows high education above 180 but under the care-plan threshold", () => {
    const insight = interpretGlucose(gReading(210), [], brentPlan);
    expect(insight.level).toBe("recheck");
    expect(insight.escalation).toBe("none");
  });

  it("tracks an in-range reading", () => {
    const insight = interpretGlucose(gReading(120), [], brentPlan);
    expect(insight.level).toBe("track");
    expect(insight.escalation).toBe("none");
  });

  it("falls back to standard low education when no care-plan threshold is set", () => {
    const insight = interpretGlucose(gReading(50), [], noThresholdPlan);
    expect(insight.level).toBe("recheck");
    expect(insight.escalation).toBe("none");
    expect(insight.source).toBe("standard_education");
  });
});
