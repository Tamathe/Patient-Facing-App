import { describe, expect, it } from "vitest";
import { demoState } from "./fixtures";
import { buildHealthBrief } from "./health-brief";

describe("buildHealthBrief", () => {
  it("includes care goal and medication sections", () => {
    const brief = buildHealthBrief(demoState);

    expect(brief.sections.map((section) => section.title)).toContain("What I am working on");
    expect(brief.sections.map((section) => section.title)).toContain("Medicines and barriers");
  });
});
