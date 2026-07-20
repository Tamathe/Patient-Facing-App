import { describe, expect, it } from "vitest";
import type { FamilyProfile } from "./types";
import { childAgeMonths, familyScreeningEntries } from "./family-screenings";

const NOW = new Date("2026-07-20T12:00:00.000Z");

function profileAtAge(ageMonths: number): FamilyProfile {
  const birth = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - ageMonths, 1));
  return {
    childFirstName: "Avery",
    birthYear: birth.getUTCFullYear(),
    birthMonth: birth.getUTCMonth() + 1,
    schoolStage: ageMonths < 48 ? "not_school_age" : "elementary",
    county: "Fayette",
    diagnoses: []
  };
}

describe("family screenings", () => {
  it.each([17, 18, 22, 23, 28, 29, 34, 35, 47, 48, 131, 132, 215, 216])(
    "calculates %i completed UTC months",
    (ageMonths) => expect(childAgeMonths(profileAtAge(ageMonths), NOW)).toBe(ageMonths)
  );

  it.each([
    [17, []],
    [18, ["swyc_18mo"]],
    [22, ["swyc_18mo"]],
    [23, []],
    [28, []],
    [29, ["swyc_30mo"]],
    [34, ["swyc_30mo"]],
    [35, []],
    [47, []],
    [48, ["psc17"]],
    [131, ["psc17"]],
    [132, ["psc17", "phq_a"]],
    [215, ["psc17", "phq_a"]],
    [216, []]
  ] as const)("exposes the exact routes at %i months", (ageMonths, expected) => {
    expect(familyScreeningEntries(profileAtAge(ageMonths), NOW).map(({ routeId }) => routeId)).toEqual(expected);
  });

  it("uses one shared POSI entry and marks pending SWYC routes as hub previews", () => {
    expect(familyScreeningEntries(profileAtAge(18), NOW)).toEqual([
      {
        routeId: "swyc_18mo",
        instrumentIds: ["swyc_18mo", "swyc_posi"],
        minAgeMonths: 18,
        maxAgeMonths: 22,
        exposure: "hub_preview"
      }
    ]);
  });

  it("returns no age or entries when birth month is absent", () => {
    const profile = { ...profileAtAge(18), birthMonth: undefined };
    expect(childAgeMonths(profile, NOW)).toBeNull();
    expect(familyScreeningEntries(profile, NOW)).toEqual([]);
  });
});
