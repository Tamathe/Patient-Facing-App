import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { healthReducer } from "./store";

describe("P4 family fixture reducer", () => {
  it("uses the supplied timestamp for the 18-month fixture and preserves every non-family slice", () => {
    const next = healthReducer(demoState, {
      type: "seedExampleFamily",
      example: "eighteen_month",
      now: "2026-01-20T12:00:00.000Z"
    });

    expect(next.family?.profile).toMatchObject({
      childFirstName: "Avery",
      birthYear: 2024,
      birthMonth: 7,
      schoolStage: "not_school_age",
      county: "Fayette",
      diagnoses: []
    });
    expect({ ...next, family: demoState.family }).toEqual(demoState);
  });

  it("ignores an invalid explicit timestamp instead of reading the device clock", () => {
    expect(
      healthReducer(demoState, { type: "seedExampleFamily", example: "eighteen_month", now: "invalid" })
    ).toBe(demoState);
  });
});
