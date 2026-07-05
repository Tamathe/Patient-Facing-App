import { describe, expect, it } from "vitest";
import { extractInstructionFacts } from "./instructions";
import type { CareContextItem } from "./types";

describe("extractInstructionFacts", () => {
  it("extracts blood pressure monitoring and follow-up from text", () => {
    const item: CareContextItem = {
      id: "ctx-1",
      patientId: "patient-1",
      title: "Visit instructions",
      rawText: "Monitor BP daily. Continue lisinopril. Follow up in 4 weeks.",
      sourceLabel: "Portal note",
      createdAt: "2026-07-05T09:00:00.000Z"
    };

    const facts = extractInstructionFacts(item);

    expect(facts.map((fact) => fact.label)).toContain("Home monitoring");
    expect(facts.map((fact) => fact.label)).toContain("Follow-up timing");
    expect(facts.every((fact) => fact.status === "needs_review")).toBe(true);
  });
});
