import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { MockHealthAiProvider } from "./mock-provider";

describe("MockHealthAiProvider", () => {
  it("explains a medication using the patient medication list", async () => {
    const provider = new MockHealthAiProvider();
    const response = await provider.respond({
      mode: "why",
      patientInput: "Why am I taking lisinopril?",
      state: demoState
    });

    expect(response.content).toContain("Lisinopril");
    expect(response.content).toContain("stroke");
    expect(response.sources).toContain("med-1");
  });

  it("uses the named medication in a multi-medication state", async () => {
    const provider = new MockHealthAiProvider();
    const multiMedicationState = {
      ...demoState,
      medications: [
        {
          ...demoState.medications[0]
        },
        {
          id: "med-2",
          patientId: "patient-1",
          name: "Metformin",
          dose: "500 mg",
          schedule: "With meals",
          purpose: "Helps lower blood sugar.",
          preventionBenefit: "Improved glucose control helps prevent complications.",
          safetyNote: "Take with food.",
          source: "patient_reported",
          activeBarriers: []
        }
      ]
    };

    const response = await provider.respond({
      mode: "why",
      patientInput: "Why am I taking metformin?",
      state: multiMedicationState
    });

    expect(response.content).toContain("Metformin");
    expect(response.sources).toContain("med-2");
    expect(response.sources).not.toContain("med-1");
  });

  it("creates visit prep guidance", async () => {
    const provider = new MockHealthAiProvider();
    const response = await provider.respond({
      mode: "visit",
      patientInput: "Help me prepare for my appointment.",
      state: demoState
    });

    expect(response.content).toContain("Bring your recent home readings");
    expect(response.sources).toContain("plan-1");
  });
});
