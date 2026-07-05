import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { MockHealthAiProvider } from "./mock-provider";
import { createSafeAiResponse } from "./safety-gate";

describe("createSafeAiResponse", () => {
  it("blocks unsafe medication change requests before provider call", async () => {
    const response = await createSafeAiResponse(
      {
        mode: "trouble",
        patientInput: "Should I stop taking lisinopril?",
        state: demoState
      },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("blocked");
    expect(response.content).toContain("I cannot tell you to stop");
  });

  it("allows education requests through the provider", async () => {
    const response = await createSafeAiResponse(
      {
        mode: "why",
        patientInput: "Why am I taking lisinopril?",
        state: demoState
      },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("allowed");
    expect(response.content).toContain("Lisinopril");
  });
});
