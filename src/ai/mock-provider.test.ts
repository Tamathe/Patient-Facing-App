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

  it("asks for medication clarification in a multi-medication state when no name matches", async () => {
    const provider = new MockHealthAiProvider();
    const multiMedicationState = {
      ...demoState,
      medications: [
        {
          ...demoState.medications[0],
          id: "med-1",
          name: "Lisinopril"
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
      patientInput: "Why am I taking the medication for this visit?",
      state: multiMedicationState
    });

    expect(response.content.toLowerCase()).toContain("multiple medications");
    expect(response.content.toLowerCase()).toContain("which one");
    expect(response.sources).toHaveLength(0);
    expect(response.content).not.toContain("Lisinopril");
    expect(response.content).not.toContain("Medip");
  });

  it("answers a food question with the food name and sodium", async () => {
    const provider = new MockHealthAiProvider();
    const response = await provider.respond({
      mode: "food",
      patientInput: "Can I have this for lunch?",
      state: demoState,
      identifiedFood: {
        id: "051000012616",
        barcode: "051000012616",
        name: "Chicken Noodle Soup",
        brand: "Campbell's",
        category: "Soups",
        nutrition: {
          servingSize: "1/2 cup",
          calories: 60,
          sodiumMg: 890,
          potassiumMg: 100,
          totalSugarsG: 1,
          addedSugarsG: 0,
          saturatedFatG: 0.5,
          fiberG: 1,
          proteinG: 3,
          carbsG: 8
        },
        source: "barcode_seed"
      }
    });

    expect(response.content).toContain("Chicken Noodle Soup");
    expect(response.content).toContain("890");
    expect(response.sources).toContain("plan-1");
  });

  it("streams mock live session events in order", async () => {
    const provider = new MockHealthAiProvider();
    const events: string[] = [];
    const handle = await provider.openLiveSession({
      language: "en",
      getState: () => demoState,
      getContext: () => ({ frameDataUrl: null, identifiedFood: null, flagTexts: [] }),
      onEvent: (event) => {
        if (event.type === "status") {
          events.push(`status:${event.status}`);
        } else {
          events.push(event.type);
        }
      }
    });

    handle.sendUserText("Is this healthy?");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(events[0]).toBe("status:listening");
    expect(events).toContain("userTranscript");
    expect(events).toContain("assistantTranscript");
    expect(events.indexOf("status:thinking")).toBeLessThan(events.indexOf("assistantTranscript"));
    expect(events.at(-1)).toBe("status:listening");
    handle.close();
  });
});
