import { describe, expect, it } from "vitest";
import {
  escalationThresholdDays,
  expectCallWithinDays,
  outcomeForGrade,
  recallDateFrom,
  recallMonthsFor,
  recallReasonFor,
  tierForResult
} from "./dr-triage";
import { outcomeToStatus } from "./screening-gap";
import type { DrGrade } from "./types";

const extraction = (grade: DrGrade | null, dmePresent: boolean | null = false, ungradable = false) => ({
  grade,
  dmePresent,
  ungradable
});

const result = (grade: DrGrade | null, dmePresent: boolean | null = false) => ({
  outcome: outcomeForGrade(extraction(grade, dmePresent, grade === null)),
  grade,
  dmePresent
});

// The locked triage table, row by row.
describe("dr-triage — locked table", () => {
  it("ungradable → ungradable outcome, no tier, rebook-now repeat flow", () => {
    const ungradable = extraction(null, null, true);
    expect(outcomeForGrade(ungradable)).toBe("ungradable");
    expect(tierForResult({ outcome: "ungradable", grade: null, dmePresent: null })).toBe("none");
    expect(recallMonthsFor(null)).toBeNull();
    expect(outcomeToStatus("ungradable")).toBe("repeat");
  });

  it("no_dr → normal, no referral, 12-month recall", () => {
    expect(outcomeForGrade(extraction("no_dr"))).toBe("normal");
    expect(tierForResult(result("no_dr"))).toBe("none");
    expect(recallMonthsFor("no_dr")).toBe(12);
    expect(recallReasonFor("no_dr")).toBe("annual_rescreen");
  });

  it("mild_npdr → normal, no referral, 12-month recall with chronic-care emphasis", () => {
    expect(outcomeForGrade(extraction("mild_npdr"))).toBe("normal");
    expect(tierForResult(result("mild_npdr"))).toBe("none");
    expect(recallMonthsFor("mild_npdr")).toBe(12);
    expect(recallReasonFor("mild_npdr")).toBe("annual_rescreen_mild");
  });

  it("moderate/severe NPDR without DME → abnormal, optometry_routine, specialist-managed", () => {
    for (const grade of ["moderate_npdr", "severe_npdr"] as const) {
      expect(outcomeForGrade(extraction(grade))).toBe("abnormal");
      expect(tierForResult(result(grade))).toBe("optometry_routine");
      expect(recallMonthsFor(grade)).toBeNull();
    }
  });

  it("any DME, or pdr → abnormal, retina_urgent", () => {
    expect(outcomeForGrade(extraction("pdr"))).toBe("abnormal");
    expect(tierForResult(result("pdr"))).toBe("retina_urgent");
    expect(tierForResult(result("moderate_npdr", true))).toBe("retina_urgent");
    expect(tierForResult(result("severe_npdr", true))).toBe("retina_urgent");
    expect(tierForResult(result("pdr", true))).toBe("retina_urgent");
  });

  it("DME beats grade even when the grade alone would be normal", () => {
    expect(outcomeForGrade(extraction("mild_npdr", true))).toBe("abnormal");
    expect(tierForResult({ outcome: "abnormal", grade: "mild_npdr", dmePresent: true })).toBe("retina_urgent");
  });
});

describe("dr-triage — escalation thresholds (locked)", () => {
  it("retina_urgent escalates after 2 days, optometry_routine after 5", () => {
    expect(escalationThresholdDays("retina_urgent")).toBe(2);
    expect(escalationThresholdDays("optometry_routine")).toBe(5);
    expect(escalationThresholdDays("none")).toBeNull();
  });

  it("the patient-facing call window matches the escalation threshold", () => {
    expect(expectCallWithinDays("retina_urgent")).toBe(2);
    expect(expectCallWithinDays("optometry_routine")).toBe(5);
  });
});

describe("recallDateFrom", () => {
  it("adds 12 months to the confirmation date by default", () => {
    expect(recallDateFrom("2026-07-07T12:00:00.000Z")).toBe("2027-07-07T12:00:00.000Z");
  });

  it("supports an explicit month count", () => {
    expect(recallDateFrom("2026-07-07T12:00:00.000Z", 6)).toBe("2027-01-07T12:00:00.000Z");
  });
});
