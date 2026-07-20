import { describe, expect, it } from "vitest";
import { LUNG_LDCT_ELIGIBILITY_INSTRUMENT, packYears } from "./lung-ldct-eligibility";

describe("lung LDCT eligibility", () => {
  it("calculates pack-years without rounding and locks the 19.9/20 boundary", () => {
    expect(packYears(1.99, 10)).toBeCloseTo(19.9);
    expect(packYears(2, 10)).toBe(20);
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.score([1, 60, 1.99, 10, -1, 0]).band).toBe("not_eligible");
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.score([1, 60, 2, 10, -1, 0]).band).toBe("eligible");
  });

  it.each([
    [49, "not_eligible"],
    [50, "eligible"],
    [80, "eligible"],
    [81, "not_eligible"]
  ] as const)("classifies age %i as %s", (age, band) => {
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.score([1, age, 1, 20, -1, 0]).band).toBe(band);
  });

  it("includes former smokers at 180 months and excludes them at 181 months", () => {
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.score([0, 65, 1, 20, 180, 0]).band).toBe("eligible");
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.score([0, 65, 1, 20, 181, 0]).band).toBe("not_eligible");
  });

  it("routes warning symptoms to clinical contact before eligibility", () => {
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.score([1, 40, 0.5, 2, -1, 1])).toEqual({
      totalScore: 1,
      band: "see_clinician_now"
    });
  });

  it("stores six fixed-position responses with an integer quit-month sentinel", () => {
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.items).toHaveLength(6);
    expect(LUNG_LDCT_ELIGIBILITY_INSTRUMENT.items[4]).toMatchObject({
      conditionalOn: { itemId: "smoking_status", atLeast: 0, atMost: 0 },
      notApplicableValue: -1,
      integer: true
    });
  });
});
