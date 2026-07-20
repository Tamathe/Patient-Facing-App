import { describe, expect, it } from "vitest";
import { PHQ_A_INSTRUMENT } from "./phq-a";

describe("PHQ-A", () => {
  it("uses exactly 13 Version 3 content items in displayed order", () => {
    expect(PHQ_A_INSTRUMENT.items.map(({ id }) => id)).toEqual([
      "little_interest",
      "down_irritable_hopeless",
      "sleep",
      "tired_energy",
      "appetite_weight",
      "feels_bad_failure",
      "concentration",
      "movement_speech",
      "self_harm",
      "functional_impairment",
      "past_year_depression",
      "past_month_serious_ideation",
      "lifetime_attempt"
    ]);
  });

  it("scores only the nine core items and locks all band boundaries", () => {
    expect(PHQ_A_INSTRUMENT.score([...Array(9).fill(0), 3, 1, 1, 1])).toEqual({ totalScore: 0, band: "minimal" });
    expect(PHQ_A_INSTRUMENT.score([1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]).band).toBe("minimal");
    expect(PHQ_A_INSTRUMENT.score([1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]).band).toBe("mild");
    expect(PHQ_A_INSTRUMENT.score([2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0]).band).toBe("moderate");
    expect(PHQ_A_INSTRUMENT.score([3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0]).band).toBe("moderately_severe");
    expect(PHQ_A_INSTRUMENT.score([3, 3, 3, 3, 3, 3, 2, 0, 0, 0, 0, 0, 0]).band).toBe("severe");
    expect(PHQ_A_INSTRUMENT.score([...Array(9).fill(3), 0, 0, 0, 0])).toEqual({ totalScore: 27, band: "severe" });
  });

  it("flags only core item 9, past-month ideation, and lifetime attempt for crisis routing", () => {
    expect(PHQ_A_INSTRUMENT.items.filter(({ crisisOnPositive }) => crisisOnPositive).map(({ id }) => id)).toEqual([
      "self_harm",
      "past_month_serious_ideation",
      "lifetime_attempt"
    ]);
  });
});
