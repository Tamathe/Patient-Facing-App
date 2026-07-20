import { describe, expect, it } from "vitest";
import type { FamilyProfile } from "./types";
import { perinatalCheckpoints } from "./perinatal";

function profileAt(birthYear: number, birthMonth?: number): FamilyProfile {
  return {
    birthYear,
    birthMonth,
    schoolStage: "not_school_age",
    county: "Scott",
    diagnoses: []
  };
}

describe("perinatalCheckpoints", () => {
  it("returns no checkpoints without a month-precise valid profile", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");

    expect(perinatalCheckpoints(null, now)).toEqual([]);
    expect(perinatalCheckpoints(undefined, now)).toEqual([]);
    expect(perinatalCheckpoints(profileAt(2026), now)).toEqual([]);
    expect(perinatalCheckpoints(profileAt(2026, 0), now)).toEqual([]);
    expect(perinatalCheckpoints(profileAt(2026, 13), now)).toEqual([]);
    expect(perinatalCheckpoints(profileAt(Number.NaN, 7), now)).toEqual([]);
    expect(perinatalCheckpoints(profileAt(2026, 7), new Date("invalid"))).toEqual([]);
  });

  it("returns no checkpoints for future births or infants older than six months", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");

    expect(perinatalCheckpoints(profileAt(2026, 8), now)).toEqual([]);
    expect(perinatalCheckpoints(profileAt(2025, 12), now)).toEqual([]);
  });

  it.each([
    [0, [{ month: 1, timing: "next" }, { month: 2, timing: "later" }, { month: 4, timing: "later" }, { month: 6, timing: "later" }]],
    [1, [{ month: 1, timing: "now" }, { month: 2, timing: "next" }, { month: 4, timing: "later" }, { month: 6, timing: "later" }]],
    [2, [{ month: 2, timing: "now" }, { month: 4, timing: "later" }, { month: 6, timing: "later" }]],
    [3, [{ month: 4, timing: "next" }, { month: 6, timing: "later" }]],
    [4, [{ month: 4, timing: "now" }, { month: 6, timing: "later" }]],
    [5, [{ month: 6, timing: "next" }]],
    [6, [{ month: 6, timing: "now" }]]
  ] as const)("maps infant age %i months to pending checkpoints", (ageMonths, expected) => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    const birth = new Date(Date.UTC(2026, 6 - ageMonths, 1));

    expect(perinatalCheckpoints(profileAt(birth.getUTCFullYear(), birth.getUTCMonth() + 1), now)).toEqual(expected);
  });

  it("uses UTC calendar months across December to January without mutating now", () => {
    const now = new Date("2026-01-31T23:59:59.999Z");
    const original = now.toISOString();

    expect(perinatalCheckpoints(profileAt(2025, 12), now)[0]).toEqual({ month: 1, timing: "now" });
    expect(now.toISOString()).toBe(original);
  });
});
