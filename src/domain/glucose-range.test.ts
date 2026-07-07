import { describe, expect, it } from "vitest";
import { computeTimeInRange } from "./glucose-range";
import type { GlucoseReading } from "./types";

function gReading(valueMgDl: number, measuredAt: string): GlucoseReading {
  return {
    id: `g-${valueMgDl}-${measuredAt}`,
    patientId: "patient-1",
    valueMgDl,
    measuredAt,
    contexts: ["morning"],
    note: ""
  };
}

// Five in-window readings so the MIN gate is satisfied by default.
function fiveOn(days: string[], value: number): GlucoseReading[] {
  return days.map((day) => gReading(value, `2026-07-${day}T07:00:00.000Z`));
}

describe("computeTimeInRange", () => {
  it("returns null with no readings", () => {
    expect(computeTimeInRange([])).toBeNull();
  });

  it("returns null below the minimum sample count", () => {
    const readings = fiveOn(["01", "02", "03", "04"], 120); // only 4
    expect(computeTimeInRange(readings)).toBeNull();
  });

  it("counts 70 and 180 as in range (inclusive boundaries)", () => {
    const readings = [
      gReading(70, "2026-07-01T07:00:00.000Z"),
      gReading(180, "2026-07-02T07:00:00.000Z"),
      gReading(120, "2026-07-03T07:00:00.000Z"),
      gReading(100, "2026-07-04T07:00:00.000Z"),
      gReading(140, "2026-07-05T07:00:00.000Z")
    ];
    const result = computeTimeInRange(readings);
    expect(result?.inRange).toBe(5);
    expect(result?.below).toBe(0);
    expect(result?.above).toBe(0);
    expect(result?.percentInRange).toBe(100);
  });

  it("classifies below, in-range, and above and rounds the percent", () => {
    const readings = [
      gReading(55, "2026-07-01T07:00:00.000Z"), // below
      gReading(210, "2026-07-02T07:00:00.000Z"), // above
      gReading(120, "2026-07-03T07:00:00.000Z"),
      gReading(150, "2026-07-04T07:00:00.000Z"),
      gReading(160, "2026-07-05T07:00:00.000Z")
    ];
    const result = computeTimeInRange(readings);
    expect(result?.below).toBe(1);
    expect(result?.above).toBe(1);
    expect(result?.inRange).toBe(3);
    expect(result?.total).toBe(5);
    expect(result?.percentInRange).toBe(60); // 3/5
  });

  it("anchors the window to the latest reading, not the wall clock", () => {
    // All readings are far in the past; anchored to the latest one they still count.
    const readings = fiveOn(["01", "02", "03", "04", "05"], 120);
    const result = computeTimeInRange(readings);
    expect(result?.total).toBe(5);
    expect(result?.percentInRange).toBe(100);
  });

  it("excludes readings older than the window relative to the anchor", () => {
    const readings = [
      gReading(300, "2026-01-01T07:00:00.000Z"), // way outside a 14-day window
      ...fiveOn(["01", "02", "03", "04", "05"], 120)
    ];
    const result = computeTimeInRange(readings);
    expect(result?.total).toBe(5); // the January outlier is excluded
    expect(result?.above).toBe(0);
  });

  it("honors a custom asOf anchor and window", () => {
    const readings = fiveOn(["01", "02", "03", "04", "05"], 120);
    const result = computeTimeInRange(readings, { asOf: "2026-07-05T07:00:00.000Z", windowDays: 2 });
    // windowStart = Jul 3 07:00 (exclusive); only Jul 4 and Jul 5 fall inside -> 2, under MIN.
    expect(result).toBeNull();
  });
});
