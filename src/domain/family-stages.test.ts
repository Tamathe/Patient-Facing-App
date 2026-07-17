import { describe, expect, it } from "vitest";
import type { FamilyNavigatorState, FamilyProfile } from "./types";
import { buildFamilyStages } from "./family-stages";

function familyWith(profile: FamilyProfile): FamilyNavigatorState {
  return {
    profile,
    interviewDraft: "",
    screenAnswers: [],
    interviews: [],
    facts: [],
    latestInterviewDomains: [],
    activeDomains: [],
    saved: [],
    alreadyEnrolled: []
  };
}

describe("buildFamilyStages", () => {
  it("builds the Morgan now, next, and later beats", () => {
    const family = familyWith({
      childFirstName: "Riley",
      birthYear: 2017,
      schoolStage: "elementary",
      county: "Scott",
      diagnoses: [
        { id: "dyslexia", label: "dyslexia", diagnosedAt: "2026-05" },
        { id: "adhd", label: "adhd", diagnosedAt: "2026-05" }
      ]
    });

    expect(buildFamilyStages(family, new Date("2026-07-17T12:00:00.000Z"))).toMatchObject([
      { id: "waiver-apply", timing: "now", domains: ["waivers_financial"] },
      { id: "school-arc", timing: "now", domains: ["school_iep"] },
      { id: "parent-connection", timing: "next", domains: ["parent_support"] },
      { id: "sibling-respite", timing: "later", domains: ["sibling_support", "respite"] }
    ]);
  });

  it("builds Casey's First Steps and age-three transition beats", () => {
    const family = familyWith({
      birthYear: 2024,
      schoolStage: "not_school_age",
      county: "Perry",
      diagnoses: [{ id: "speech", label: "speech_language" }]
    });

    expect(buildFamilyStages(family, new Date("2026-07-17T12:00:00.000Z"))).toMatchObject([
      { id: "first-steps", timing: "now", domains: ["early_intervention"] },
      { id: "age-three-transition", timing: "later", domains: ["early_intervention", "school_iep"] }
    ]);
  });

  it("uses exact UTC birth-month age for the 2-year-3-month transition trigger", () => {
    const family = familyWith({
      birthYear: 2024,
      birthMonth: 5,
      schoolStage: "not_school_age",
      county: "Perry",
      diagnoses: []
    });

    const before = buildFamilyStages(family, new Date("2026-07-31T23:59:00.000Z"));
    const atTrigger = buildFamilyStages(family, new Date("2026-08-01T00:00:00.000Z"));

    expect(before.some(({ id }) => id === "age-three-transition")).toBe(false);
    expect(atTrigger.some(({ id }) => id === "age-three-transition")).toBe(true);
  });

  it("does not fire a month-precise transition early but fires conservatively for year-only age", () => {
    const base: FamilyProfile = {
      birthYear: 2024,
      schoolStage: "not_school_age",
      county: "Perry",
      diagnoses: []
    };
    const now = new Date("2026-01-15T12:00:00.000Z");

    expect(buildFamilyStages(familyWith({ ...base, birthMonth: 12 }), now).map(({ id }) => id)).toEqual([
      "first-steps"
    ]);
    expect(buildFamilyStages(familyWith(base), now).map(({ id }) => id)).toEqual([
      "first-steps",
      "age-three-transition"
    ]);
  });

  it("fires future-planning thresholds from UTC month math and conservatively for year-only data", () => {
    const base: FamilyProfile = {
      birthYear: 2012,
      schoolStage: "middle",
      county: "Scott",
      diagnoses: []
    };
    const before = new Date("2026-11-30T23:30:00.000Z");

    expect(buildFamilyStages(familyWith({ ...base, birthMonth: 12 }), before)).toEqual([]);
    expect(
      buildFamilyStages(familyWith({ ...base, birthMonth: 12 }), new Date("2026-11-30T23:30:00-05:00"))
    ).toMatchObject([{ id: "mission-transition" }]);
    expect(buildFamilyStages(familyWith({ ...base, birthMonth: 12 }), new Date("2026-12-01T00:00:00.000Z"))).toMatchObject([
      { id: "mission-transition", timing: "now", domains: ["future_planning"] }
    ]);
    expect(buildFamilyStages(familyWith(base), new Date("2026-01-01T00:00:00.000Z"))).toMatchObject([
      { id: "mission-transition", timing: "now", domains: ["future_planning"] }
    ]);

    const ageSeventeen = familyWith({ ...base, birthYear: 2009 });
    expect(buildFamilyStages(ageSeventeen, new Date("2026-01-01T00:00:00.000Z")).map(({ id }) => id)).toEqual([
      "mission-transition",
      "before-eighteen"
    ]);
  });

  it("surfaces the school-enrollment trigger throughout a possible year-only age-four year", () => {
    const yearOnly = familyWith({
      birthYear: 2022,
      schoolStage: "preschool",
      county: "Perry",
      diagnoses: []
    });

    expect(buildFamilyStages(yearOnly, new Date("2026-01-01T00:00:00.000Z"))).toMatchObject([
      { id: "school-enrollment", timing: "now", domains: ["school_iep"] }
    ]);
  });

  it("keeps First Steps visible throughout a year when a year-only child could still be under three", () => {
    const yearOnly = familyWith({
      birthYear: 2024,
      schoolStage: "not_school_age",
      county: "Perry",
      diagnoses: []
    });

    expect(
      buildFamilyStages(yearOnly, new Date("2027-12-31T23:59:00.000Z")).some(
        ({ id, timing }) => id === "first-steps" && timing === "now"
      )
    ).toBe(true);
  });

  it("returns no stages without a profile", () => {
    expect(buildFamilyStages({ ...familyWith({ birthYear: 2024, schoolStage: "not_school_age", county: "Perry", diagnoses: [] }), profile: null }, new Date())).toEqual([]);
  });
});
