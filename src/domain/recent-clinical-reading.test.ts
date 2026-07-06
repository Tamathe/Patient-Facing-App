import { describe, expect, it } from "vitest";
import { findRecentGlucoseReading } from "./recent-clinical-reading";
import { brentState, demoState } from "./fixtures";
import type { GlucoseReading } from "./types";

const REF = "2026-07-05T12:00:00.000Z";

function gReading(valueMgDl: number, measuredAt = "2026-07-05T11:00:00.000Z"): GlucoseReading {
  return {
    id: `g-${valueMgDl}-${measuredAt}`,
    patientId: "patient-brent",
    valueMgDl,
    measuredAt,
    contexts: ["morning"],
    note: ""
  };
}

describe("findRecentGlucoseReading", () => {
  it("flags a recent severe low as severe", () => {
    const found = findRecentGlucoseReading([gReading(45)], brentState.carePlan, { referenceTime: REF });
    expect(found?.severity).toBe("severe");
    expect(found?.reading.valueMgDl).toBe(45);
  });

  it("flags a care-plan threshold breach as clinic_threshold", () => {
    const found = findRecentGlucoseReading([gReading(320)], brentState.carePlan, { referenceTime: REF });
    expect(found?.severity).toBe("clinic_threshold");
  });

  it("ignores an in-range recent reading", () => {
    expect(findRecentGlucoseReading([gReading(120)], brentState.carePlan, { referenceTime: REF })).toBeUndefined();
  });

  it("ignores readings outside the 24h recency window", () => {
    const old = gReading(45, "2026-07-01T07:00:00.000Z");
    expect(findRecentGlucoseReading([old], brentState.carePlan, { referenceTime: REF })).toBeUndefined();
  });

  it("flags a severe low even with no care-plan glucose thresholds", () => {
    const found = findRecentGlucoseReading([gReading(45)], demoState.carePlan, { referenceTime: REF });
    expect(found?.severity).toBe("severe");
  });

  it("prefers a severe low over a threshold reading in the same window", () => {
    const found = findRecentGlucoseReading([gReading(320), gReading(45)], brentState.carePlan, { referenceTime: REF });
    expect(found?.severity).toBe("severe");
  });
});
