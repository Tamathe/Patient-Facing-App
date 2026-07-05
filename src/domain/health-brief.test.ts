import { describe, expect, it } from "vitest";
import { demoState } from "./fixtures";
import { buildHealthBrief } from "./health-brief";

describe("buildHealthBrief", () => {
  it("includes care goal and medication sections", () => {
    const brief = buildHealthBrief(demoState);

    expect(brief.sections.map((section) => section.title)).toContain("What I am working on");
    expect(brief.sections.map((section) => section.title)).toContain("Medicines and barriers");
  });

  it("adds clinician-authored call threshold and warning symptom guidance", () => {
    const brief = buildHealthBrief(demoState);
    const urgencySection = brief.sections.find((section) => section.title === "When to call my care team");

    expect(urgencySection).toBeDefined();
    expect(urgencySection?.status).toBe("confirmed");
    expect(urgencySection?.items.join(" ")).toContain("Clinician-confirmed care-plan guidance.");
    expect(urgencySection?.items.join(" ")).toContain("160");
    expect(urgencySection?.items.join(" ")).toContain("100");
    expect(urgencySection?.items.join(" ")).toContain("chest pain");
  });

  it("marks inferred status for standard education threshold guidance", () => {
    const brief = buildHealthBrief({
      ...demoState,
      carePlan: {
        ...demoState.carePlan,
        thresholdSource: "standard_education"
      }
    });
    const urgencySection = brief.sections.find((section) => section.title === "When to call my care team");

    expect(urgencySection?.status).toBe("inferred");
    expect(urgencySection?.items.join(" ")).toContain("Standard education guidance");
  });

  it("uses provided generatedAt and marks missing medicines for review", () => {
    const brief = buildHealthBrief(
      { ...demoState, medications: [] },
      { generatedAt: "2026-07-05T12:00:00.000Z" }
    );
    const medicationSection = brief.sections.find((section) => section.title === "Medicines and barriers");

    expect(brief.generatedAt).toBe("2026-07-05T12:00:00.000Z");
    expect(medicationSection?.status).toBe("needs_review");
    expect(medicationSection?.items[0]).toBe(
      "No medicines are listed yet. Add them so your care team can review everything you take."
    );
  });
});
