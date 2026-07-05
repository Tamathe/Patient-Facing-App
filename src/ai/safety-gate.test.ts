import { describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import { MockHealthAiProvider } from "./mock-provider";
import { createSafeAiResponse } from "./safety-gate";
import type { HealthAiProvider } from "./types";

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

  it("escalates for dangerous state reading even when patient input is blocked", async () => {
    const stateWithDangerousReading = {
      ...demoState,
      readings: [
        {
          id: "reading-1",
          patientId: "patient-1",
          systolic: 170,
          diastolic: 104,
          pulse: 76,
          measuredAt: "2026-07-05T12:00:00.000Z",
          contexts: ["morning"],
          note: "Morning check."
        }
      ]
    };
    const provider: HealthAiProvider = {
      respond: vi.fn().mockResolvedValue({
        content: "This should not be called.",
        safety: "allowed" as const,
        sources: ["plan-1"]
      })
    };

    const response = await createSafeAiResponse(
      {
        mode: "trouble",
        patientInput: "Should I stop taking lisinopril?",
        state: stateWithDangerousReading
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.content).toContain("call threshold");
    expect(provider.respond).not.toHaveBeenCalled();
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

  it("escalates on dangerous latest reading even with normal patient input", async () => {
    const stateWithDangerousReading = {
      ...demoState,
      readings: [
        {
          id: "reading-1",
          patientId: "patient-1",
          systolic: 170,
          diastolic: 104,
          pulse: 76,
          measuredAt: "2026-07-05T12:00:00.000Z",
          contexts: ["morning"],
          note: "Morning check."
        }
      ]
    };
    const provider: HealthAiProvider = {
      respond: vi.fn().mockResolvedValue({
        content: "This should not be called.",
        safety: "allowed" as const,
        sources: ["plan-1"]
      })
    };

    const response = await createSafeAiResponse(
      {
        mode: "today",
        patientInput: "What should I do today?",
        state: stateWithDangerousReading
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.content).toContain("call threshold");
    expect(response.content).toContain("If you are feeling worse");
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it("escalates when an active side effects medication barrier exists before provider call", async () => {
    const stateWithSideEffects = {
      ...demoState,
      medications: [
        {
          ...demoState.medications[0],
          activeBarriers: ["side_effects"]
        }
      ]
    };
    const provider: HealthAiProvider = {
      respond: vi.fn().mockResolvedValue({
        content: "This should not be called.",
        safety: "allowed" as const,
        sources: ["plan-1"]
      })
    };

    const response = await createSafeAiResponse(
      {
        mode: "why",
        patientInput: "Can you explain why I'm taking lisinopril?",
        state: stateWithSideEffects
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.content).toContain("active side effects");
    expect(response.content).toContain("contact your care team");
    expect(provider.respond).not.toHaveBeenCalled();
  });
});
