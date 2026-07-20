import { describe, expect, it } from "vitest";
import { eighteenMonthFamilyState } from "./family-fixtures";

describe("eighteenMonthFamilyState", () => {
  it.each([
    ["2026-07-20T12:00:00.000Z", 2025, 1],
    ["2026-01-20T12:00:00.000Z", 2024, 7]
  ])("subtracts exactly 18 UTC calendar months across year boundaries", (iso, birthYear, birthMonth) => {
    const state = eighteenMonthFamilyState(new Date(iso));
    expect(state.profile).toEqual({
      childFirstName: "Avery",
      birthYear,
      birthMonth,
      schoolStage: "not_school_age",
      county: "Fayette",
      diagnoses: []
    });
    expect(state).toMatchObject({
      interviewDraft: "",
      screenAnswers: [],
      interviews: [],
      facts: [],
      latestInterviewDomains: [],
      activeDomains: [],
      saved: [],
      alreadyEnrolled: []
    });
  });
});
