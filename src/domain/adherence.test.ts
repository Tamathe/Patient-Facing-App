import { describe, expect, it } from "vitest";
import { getAdherenceRate, getAdherenceStreak, getDoseForDate, summarizeBpTrend, toDateKey } from "./adherence";
import type { DoseEvent, HomeReading } from "./types";

const TODAY = new Date(2026, 6, 5, 12, 0, 0); // 2026-07-05 local noon

function taken(date: string): DoseEvent {
  return {
    id: `t-${date}`,
    patientId: "patient-1",
    medicationId: "med-1",
    date,
    status: "taken",
    barrier: null,
    recordedAt: `${date}T08:00:00.000Z`
  };
}

function skipped(date: string): DoseEvent {
  return {
    id: `s-${date}`,
    patientId: "patient-1",
    medicationId: "med-1",
    date,
    status: "skipped",
    barrier: "forgot",
    recordedAt: `${date}T08:00:00.000Z`
  };
}

function reading(systolic: number, measuredAt: string): HomeReading {
  return {
    id: `r-${measuredAt}-${systolic}`,
    patientId: "patient-1",
    systolic,
    diastolic: 80,
    pulse: 70,
    measuredAt,
    contexts: ["morning"],
    note: ""
  };
}

describe("toDateKey", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(toDateKey(TODAY)).toBe("2026-07-05");
  });
});

describe("getDoseForDate", () => {
  it("finds the dose for a medication on a given day", () => {
    const events = [taken("2026-07-04"), taken("2026-07-05")];
    expect(getDoseForDate(events, "med-1", "2026-07-05")?.status).toBe("taken");
    expect(getDoseForDate(events, "med-1", "2026-07-01")).toBeUndefined();
    expect(getDoseForDate(events, "med-2", "2026-07-05")).toBeUndefined();
  });
});

describe("getAdherenceStreak", () => {
  it("counts consecutive taken days including today", () => {
    const events = [taken("2026-07-03"), taken("2026-07-04"), taken("2026-07-05")];
    expect(getAdherenceStreak(events, "med-1", TODAY)).toBe(3);
  });

  it("does not zero the streak when today is not logged yet", () => {
    const events = [taken("2026-07-03"), taken("2026-07-04")];
    expect(getAdherenceStreak(events, "med-1", TODAY)).toBe(2);
  });

  it("breaks the streak on a skipped day", () => {
    const events = [taken("2026-07-03"), skipped("2026-07-04"), taken("2026-07-05")];
    expect(getAdherenceStreak(events, "med-1", TODAY)).toBe(1);
  });

  it("is zero with no taken doses", () => {
    expect(getAdherenceStreak([], "med-1", TODAY)).toBe(0);
    expect(getAdherenceStreak([skipped("2026-07-05")], "med-1", TODAY)).toBe(0);
  });
});

describe("getAdherenceRate", () => {
  it("counts taken days within the window", () => {
    const events = [taken("2026-07-05"), taken("2026-07-04"), taken("2026-07-01"), taken("2026-06-20")];
    expect(getAdherenceRate(events, "med-1", 7, TODAY)).toEqual({ taken: 3, of: 7 });
  });
});

describe("summarizeBpTrend", () => {
  it("returns null below the minimum reading count", () => {
    const readings = [reading(150, "2026-07-01T08:00:00.000Z"), reading(148, "2026-07-02T08:00:00.000Z")];
    expect(summarizeBpTrend(readings)).toBeNull();
  });

  it("reports improvement when recent readings are lower", () => {
    const readings = [
      reading(150, "2026-07-01T08:00:00.000Z"),
      reading(152, "2026-07-02T08:00:00.000Z"),
      reading(148, "2026-07-03T08:00:00.000Z"),
      reading(130, "2026-07-04T08:00:00.000Z"),
      reading(132, "2026-07-05T08:00:00.000Z"),
      reading(128, "2026-07-06T08:00:00.000Z")
    ];
    expect(summarizeBpTrend(readings)?.direction).toBe("improving");
  });

  it("reports rising when recent readings are higher", () => {
    const readings = [
      reading(128, "2026-07-01T08:00:00.000Z"),
      reading(130, "2026-07-02T08:00:00.000Z"),
      reading(126, "2026-07-03T08:00:00.000Z"),
      reading(150, "2026-07-04T08:00:00.000Z"),
      reading(152, "2026-07-05T08:00:00.000Z"),
      reading(148, "2026-07-06T08:00:00.000Z")
    ];
    expect(summarizeBpTrend(readings)?.direction).toBe("rising");
  });

  it("reports steady when readings are flat", () => {
    const readings = [
      reading(130, "2026-07-01T08:00:00.000Z"),
      reading(131, "2026-07-02T08:00:00.000Z"),
      reading(129, "2026-07-03T08:00:00.000Z"),
      reading(130, "2026-07-04T08:00:00.000Z"),
      reading(131, "2026-07-05T08:00:00.000Z"),
      reading(129, "2026-07-06T08:00:00.000Z")
    ];
    expect(summarizeBpTrend(readings)?.direction).toBe("steady");
  });
});
