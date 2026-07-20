import { describe, expect, it } from "vitest";
import { SWYC_30MO_INSTRUMENT } from "./swyc-milestones-30mo";

function responsesForTotal(total: number): number[] {
  return Array.from({ length: 10 }, (_, index) => Math.max(0, Math.min(2, total - index * 2)));
}

describe("SWYC 30-month Milestones", () => {
  it("locks the official English and Spanish item order", () => {
    expect(SWYC_30MO_INSTRUMENT.items.map(({ en }) => en)).toEqual([
      "Names at least one color",
      "Tries to get you to watch by saying \"Look at me\"",
      "Says his or her first name when asked",
      "Draws lines",
      "Talks so other people can understand him or her most of the time",
      "Washes and dries hands without help (even if you turn on the water)",
      "Asks questions beginning with \"why\" or \"how\" - like \"Why no cookie?\"",
      "Explains the reasons for things, like needing a sweater when it's cold",
      "Compares things - using words like \"bigger\" or \"shorter\"",
      "Answers questions like \"What do you do when you are cold?\" or \"...when you are sleepy?\""
    ]);
    expect(SWYC_30MO_INSTRUMENT.items.every(({ es }) => es.length > 0)).toBe(true);
  });

  it.each([
    [29, 9],
    [30, 10],
    [31, 11],
    [32, 12],
    [33, 13],
    [34, 13]
  ])("uses the locked %i-month cutoff", (childAgeMonths, cutoff) => {
    expect(SWYC_30MO_INSTRUMENT.score(responsesForTotal(cutoff), { childAgeMonths }).band).toBe("discuss");
    expect(SWYC_30MO_INSTRUMENT.score(responsesForTotal(cutoff + 1), { childAgeMonths }).band).toBe(
      "meets_expectations"
    );
  });

  it("scores 0 and 20 and refuses missing or out-of-range month context", () => {
    expect(SWYC_30MO_INSTRUMENT.score(Array(10).fill(0), { childAgeMonths: 29 }).totalScore).toBe(0);
    expect(SWYC_30MO_INSTRUMENT.score(Array(10).fill(2), { childAgeMonths: 34 }).totalScore).toBe(20);
    expect(() => SWYC_30MO_INSTRUMENT.score(Array(10).fill(1))).toThrow(RangeError);
    expect(() => SWYC_30MO_INSTRUMENT.score(Array(10).fill(1), { childAgeMonths: 28 })).toThrow(RangeError);
    expect(() => SWYC_30MO_INSTRUMENT.score(Array(10).fill(1), { childAgeMonths: 35 })).toThrow(RangeError);
  });
});
