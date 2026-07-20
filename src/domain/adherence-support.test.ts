import { describe, expect, it } from "vitest";
import type { AiMode, Medication, MedicationBarrier } from "./types";
import { buildBarrierSupport } from "./adherence-support";

const medication: Medication = {
  id: "med-1",
  patientId: "patient-1",
  name: "Lisinopril",
  dose: "10 mg",
  schedule: "Once daily",
  purpose: "Helps lower blood pressure.",
  preventionBenefit: "Lowers the chance of stroke.",
  safetyNote: "Do not change the dose without your clinician.",
  source: "patient_reported",
  activeBarriers: []
};

const expectedModes: Record<MedicationBarrier, AiMode> = {
  forgot: "today",
  side_effects: "trouble",
  does_not_feel_necessary: "why",
  ran_out: "trouble",
  cost: "trouble",
  confused: "trouble",
  scared: "trouble",
  pharmacy_issue: "trouble"
};

describe("buildBarrierSupport", () => {
  it.each(Object.entries(expectedModes) as Array<[MedicationBarrier, AiMode]>)
  ("maps %s to an editable %s Coach prompt", (barrier, expectedMode) => {
    const support = buildBarrierSupport(medication, barrier);
    const url = new URL(support.href, "https://example.test");

    expect(support.mode).toBe(expectedMode);
    expect(support.prompt).toContain("Lisinopril");
    expect(url.pathname).toBe("/chat");
    expect(url.searchParams.get("mode")).toBe(expectedMode);
    expect(url.searchParams.get("concern")).toBe(support.prompt);
    expect(support.linkLabel.length).toBeGreaterThan(0);
  });

  it("reassures only when the patient doubts the medicine is needed", () => {
    const whySupport = buildBarrierSupport(medication, "does_not_feel_necessary");
    const costSupport = buildBarrierSupport(medication, "cost");

    expect(whySupport.reassurance).toContain(medication.purpose);
    expect(whySupport.reassurance).toContain(medication.preventionBenefit);
    expect(costSupport.reassurance).toBeUndefined();
  });
});
