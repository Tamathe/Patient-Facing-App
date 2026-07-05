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
