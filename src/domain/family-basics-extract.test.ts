import { describe, expect, it } from "vitest";
import { extractFamilyBasics, hasFamilyBasicsHints } from "./family-basics-extract";

const NOW = new Date("2026-07-21T00:00:00.000Z");

describe("extractFamilyBasics", () => {
  it("reads county, age, and school stage out of the caregiver's own description", () => {
    const hints = extractFamilyBasics(
      "I have a seven-year-old who has behavioral issues. He has been kicked out of school several times. We live in Breathitt County and we need help.",
      NOW
    );

    expect(hints.county).toMatchObject({ value: "Breathitt" });
    expect(hints.county?.sourceSnippet).toMatch(/Breathitt County/);
    expect(hints.birthYear).toMatchObject({ value: 2019, approximate: true });
    expect(hints.birthYear?.sourceSnippet).toMatch(/seven-year-old/i);
    expect(hints.schoolStage).toMatchObject({ value: "elementary" });
    expect(hasFamilyBasicsHints(hints)).toBe(true);
  });

  it("accepts a bare county name only after a live-here verb", () => {
    expect(extractFamilyBasics("We live in Union and need speech therapy.", NOW).county).toMatchObject({
      value: "Union"
    });
    expect(extractFamilyBasics("The union rep said to ask about therapy.", NOW).county).toBeUndefined();
    expect(extractFamilyBasics("He is a clay-obsessed kid who loves art.", NOW).county).toBeUndefined();
  });

  it("prefers an explicit grade over an age-derived stage", () => {
    const hints = extractFamilyBasics("My 12 year old is in fourth grade and struggling with reading.", NOW);

    expect(hints.birthYear).toMatchObject({ value: 2014 });
    expect(hints.schoolStage).toMatchObject({ value: "elementary" });
  });

  it("derives a birth year from an age in months for babies", () => {
    const hints = extractFamilyBasics("Our 18-month-old is not babbling yet.", NOW);

    expect(hints.birthYear).toMatchObject({ value: 2025, approximate: true });
    expect(hints.schoolStage).toBeUndefined();
  });

  it("does not guess a school stage from age alone", () => {
    const hints = extractFamilyBasics("My 7 year old melts down every evening at home.", NOW);

    expect(hints.birthYear).toMatchObject({ value: 2019 });
    expect(hints.schoolStage).toBeUndefined();
  });

  it("returns nothing when the caregiver gave no basics", () => {
    const hints = extractFamilyBasics("Reading homework is a nightly battle and I keep hearing about waivers.", NOW);

    expect(hints.county).toBeUndefined();
    expect(hints.birthYear).toBeUndefined();
    expect(hasFamilyBasicsHints(hints)).toBe(false);
  });

  it("reads Spanish descriptions", () => {
    const hints = extractFamilyBasics(
      "Vivimos en el condado de Scott. Mi hijo de siete años está en segundo grado y la escuela no ayuda.",
      NOW,
      "es"
    );

    expect(hints.county).toMatchObject({ value: "Scott" });
    expect(hints.birthYear).toMatchObject({ value: 2019 });
    expect(hints.schoolStage).toMatchObject({ value: "elementary" });
  });
});
