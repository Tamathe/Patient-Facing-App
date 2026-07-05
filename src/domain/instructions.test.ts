import { describe, expect, it } from "vitest";
import { extractInstructionFacts } from "./instructions";
import type { CareContextItem } from "./types";

describe("extractInstructionFacts", () => {
  it("extracts common medication and follow-up instruction variants", () => {
    const item: CareContextItem = {
      id: "ctx-1",
      patientId: "patient-1",
      title: "Visit instructions",
      rawText: "Check blood pressure every morning. Take amlodipine as prescribed. Follow up next month.",
      sourceLabel: "Portal note",
      createdAt: "2026-07-05T09:00:00.000Z"
    };

    const facts = extractInstructionFacts(item);

    expect(facts.map((fact) => fact.label)).toContain("Home monitoring");
    expect(facts.map((fact) => fact.label)).toContain("Medication instruction");
    expect(facts.map((fact) => fact.label)).toContain("Follow-up timing");
    expect(facts.every((fact) => fact.status === "needs_review")).toBe(true);
  });

  it("falls back to a review-needed message when no deterministic patterns match", () => {
    const item: CareContextItem = {
      id: "ctx-2",
      patientId: "patient-1",
      title: "Visit instructions",
      rawText: "Patient felt good today and denied complaints.",
      sourceLabel: "Portal note",
      createdAt: "2026-07-05T09:00:00.000Z"
    };

    const facts = extractInstructionFacts(item);

    expect(facts).toHaveLength(1);
    expect(facts[0].label).toBe("Needs review");
    expect(facts[0].status).toBe("needs_review");
  });
});
