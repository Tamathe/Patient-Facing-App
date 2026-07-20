import { describe, expect, it } from "vitest";
import { SWYC_18MO_INSTRUMENT } from "./swyc-milestones-18mo";

function responsesForTotal(total: number): number[] {
  return Array.from({ length: 10 }, (_, index) => Math.max(0, Math.min(2, total - index * 2)));
}

describe("SWYC 18-month Milestones", () => {
  it("locks the official item order and bilingual response columns", () => {
    expect(SWYC_18MO_INSTRUMENT.items.map(({ en }) => en)).toEqual([
      "Runs",
      "Walks up stairs with help",
      "Kicks a ball",
      "Names at least 5 familiar objects - like ball or milk",
      "Names at least 5 body parts - like nose, hand, or tummy",
      "Climbs up a ladder at a playground",
      "Uses words like \"me\" or \"mine\"",
      "Jumps off the ground with two feet",
      "Puts 2 or more words together - like \"more water\" or \"go outside\"",
      "Uses words to ask for help"
    ]);
    expect(SWYC_18MO_INSTRUMENT.defaultOptions).toEqual([
      { value: 0, en: "Not Yet", es: "Todavía No" },
      { value: 1, en: "Somewhat", es: "Algunas Veces" },
      { value: 2, en: "Very Much", es: "Mucho" }
    ]);
  });

  it.each([
    [18, 8],
    [19, 10],
    [20, 11],
    [21, 13],
    [22, 14]
  ])("uses the locked %i-month cutoff", (childAgeMonths, cutoff) => {
    expect(SWYC_18MO_INSTRUMENT.score(responsesForTotal(cutoff), { childAgeMonths })).toEqual({
      totalScore: cutoff,
      band: "discuss"
    });
    expect(SWYC_18MO_INSTRUMENT.score(responsesForTotal(cutoff + 1), { childAgeMonths })).toEqual({
      totalScore: cutoff + 1,
      band: "meets_expectations"
    });
  });

  it("scores the full 0-20 range and rejects missing or out-of-band age context", () => {
    expect(SWYC_18MO_INSTRUMENT.score(Array(10).fill(0), { childAgeMonths: 18 }).totalScore).toBe(0);
    expect(SWYC_18MO_INSTRUMENT.score(Array(10).fill(2), { childAgeMonths: 22 }).totalScore).toBe(20);
    expect(() => SWYC_18MO_INSTRUMENT.score(Array(10).fill(1))).toThrow(RangeError);
    expect(() => SWYC_18MO_INSTRUMENT.score(Array(10).fill(1), { childAgeMonths: 17 })).toThrow(RangeError);
    expect(() => SWYC_18MO_INSTRUMENT.score(Array(10).fill(1), { childAgeMonths: 23 })).toThrow(RangeError);
    expect(SWYC_18MO_INSTRUMENT.consent.en.points.join(" ")).toMatch(/adjusted-age.*not supported/i);
    expect(SWYC_18MO_INSTRUMENT.consent.es.points.join(" ")).toMatch(/no permite ajustar la edad/i);
  });
});
