import { describe, expect, it } from "vitest";
import { SWYC_POSI_INSTRUMENT } from "./swyc-posi";

describe("SWYC POSI", () => {
  it("uses five single-choice rows and two allow-empty multi-choice rows", () => {
    expect(SWYC_POSI_INSTRUMENT.items).toHaveLength(7);
    expect(SWYC_POSI_INSTRUMENT.items.map(({ kind }) => kind)).toEqual([
      "choice",
      "choice",
      "choice",
      "choice",
      "choice",
      "multi_choice",
      "multi_choice"
    ]);
    expect(SWYC_POSI_INSTRUMENT.items.slice(5).every(({ allowEmpty }) => allowEmpty === true)).toBe(true);
  });

  it.each([0, 1, 2, 3, 4])("scores the official columns on single-choice row %i", (optionIndex) => {
    const item = SWYC_POSI_INSTRUMENT.items[optionIndex === 0 ? 0 : 1];
    const response = item.options?.[optionIndex]?.value ?? -1;
    const expected = optionIndex >= 2 ? 1 : 0;
    const responses = [0, 0, 0, 0, 0, 0, 0];
    responses[optionIndex === 0 ? 0 : 1] = response;
    expect(SWYC_POSI_INSTRUMENT.score(responses).totalScore).toBe(expected);
  });

  it.each([
    [5, 0, 0],
    [5, 1, 0],
    [5, 4, 1],
    [5, 1 | 4, 1],
    [5, 4 | 8 | 16, 1],
    [6, 0, 0],
    [6, 2, 0],
    [6, 4, 1],
    [6, 1 | 4, 1],
    [6, 4 | 8 | 16, 1]
  ])("scores multi-choice row %i mask %i as %i", (rowIndex, mask, expected) => {
    const responses = [0, 0, 0, 0, 0, 0, 0];
    responses[rowIndex] = mask;
    expect(SWYC_POSI_INSTRUMENT.score(responses).totalScore).toBe(expected);
  });

  it("treats active play as concerning and locks the total 2/3 boundary", () => {
    const activePlay = SWYC_POSI_INSTRUMENT.items[6].options?.find(({ en }) =>
      en.startsWith("Climbing, running")
    );
    expect(activePlay).toMatchObject({ value: 4, score: 1 });
    expect(SWYC_POSI_INSTRUMENT.score([2, 2, 0, 0, 0, 0, 0])).toEqual({ totalScore: 2, band: "lower_risk" });
    expect(SWYC_POSI_INSTRUMENT.score([2, 2, 2, 0, 0, 0, 0])).toEqual({ totalScore: 3, band: "discuss" });
  });
});
