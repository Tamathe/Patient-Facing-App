import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import { tSafety } from "@/i18n/strings";
import { MockHealthAiProvider } from "./mock-provider";
import { CRISIS_ACTIONS, EMERGENCY_ACTIONS, createSafeAiResponse } from "./safety-gate";
import type { AppState } from "@/domain/types";
import type { HealthAiProvider } from "./types";

const dangerousReadingAtNow = {
  id: "reading-1",
  patientId: "patient-1",
  systolic: 170,
  diastolic: 104,
  pulse: 76,
  measuredAt: "2026-07-05T12:00:00.000Z",
  contexts: ["morning" as const],
  note: ""
};

const NOW = new Date("2026-07-05T12:00:00.000Z");

const chestPainReading = {
  id: "reading-chest-pain-older",
  patientId: "patient-1",
  systolic: 128,
  diastolic: 82,
  pulse: 72,
  measuredAt: "2026-07-05T10:30:00.000Z",
  contexts: ["morning"],
  note: "I had chest pain for 5 minutes."
};

const thresholdReading = {
  id: "reading-threshold-later",
  patientId: "patient-1",
  systolic: 165,
  diastolic: 102,
  pulse: 70,
  measuredAt: "2026-07-05T11:00:00.000Z",
  contexts: ["morning"],
  note: ""
};

describe("createSafeAiResponse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    expect(response.banner).toContain("I cannot tell you to stop");
    expect(response.actions).toContain("call_clinic");
    expect(response.content.length).toBeGreaterThan(0);
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
    expect(response.banner).toContain("call threshold");
    expect(response.actions).toContain("call_clinic");
    expect(provider.respond).toHaveBeenCalledTimes(1);
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
    expect(response.banner).toContain("call threshold");
    expect(response.banner).toContain("If you are feeling worse");
    expect(response.actions).toContain("call_clinic");
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it("escalates on very low recent reading before provider call", async () => {
    const stateWithLowReading = {
      ...demoState,
      readings: [
        {
          id: "reading-low",
          patientId: "patient-1",
          systolic: 82,
          diastolic: 50,
          pulse: 62,
          measuredAt: "2026-07-05T12:00:00.000Z",
          contexts: ["morning"],
          note: "Feeling weak."
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
        state: stateWithLowReading
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.content).toContain("seek urgent help now");
    expect(response.sources).toContain("reading-low");
    expect(provider.respond).not.toHaveBeenCalled();
  });


  it("escalates on earlier dangerous reading when a later normal reading exists", async () => {
    const stateWithEarlierDangerousReading = {
      ...demoState,
      readings: [
        {
          id: "reading-latest",
          patientId: "patient-1",
          systolic: 128,
          diastolic: 82,
          pulse: 72,
          measuredAt: "2026-07-05T11:00:00.000Z",
          contexts: ["morning"],
          note: "Feeling okay now."
        },
        {
          id: "reading-earlier",
          patientId: "patient-1",
          systolic: 170,
          diastolic: 104,
          pulse: 76,
          measuredAt: "2026-07-05T10:00:00.000Z",
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
        patientInput: "What should I do?",
        state: stateWithEarlierDangerousReading
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.banner).toContain("call threshold");
    expect(response.banner).toContain("If you are feeling worse");
    expect(response.actions).toContain("call_clinic");
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it("does not escalate from stale urgent or blocked readings outside the 24-hour real-time window", async () => {
    const stateWithStaleReadings = {
      ...demoState,
      readings: [
        {
          id: "reading-stale-blocked",
          patientId: "patient-1",
          systolic: 120,
          diastolic: 80,
          pulse: 74,
          measuredAt: "2026-07-03T09:00:00.000Z",
          contexts: ["morning"],
          note: "Should I increase my dose?"
        },
        {
          id: "reading-stale-danger",
          patientId: "patient-1",
          systolic: 170,
          diastolic: 104,
          pulse: 76,
          measuredAt: "2026-07-03T10:00:00.000Z",
          contexts: ["morning"],
          note: "Morning check."
        },
        {
          id: "reading-current-safe",
          patientId: "patient-1",
          systolic: 128,
          diastolic: 82,
          pulse: 72,
          measuredAt: "2026-07-05T10:00:00.000Z",
          contexts: ["morning"],
          note: "Feeling okay now."
        }
      ]
    };
    const provider: HealthAiProvider = {
      respond: vi.fn().mockResolvedValue({
        content: "I can help you plan your next check-in.",
        safety: "allowed" as const,
        sources: []
      })
    };

    const response = await createSafeAiResponse(
      {
        mode: "today",
        patientInput: "What should I do today?",
        state: stateWithStaleReadings
      },
      provider
    );

    expect(response.safety).toBe("allowed");
    expect(response.content).toContain("next check-in");
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it("escalates when an older dangerous reading exists and a newer blocked note is newer", async () => {
    const stateWithBlockedLatestAndEarlierDanger = {
      ...demoState,
      readings: [
        {
          id: "reading-latest",
          patientId: "patient-1",
          systolic: 120,
          diastolic: 80,
          pulse: 74,
          measuredAt: "2026-07-05T11:00:00.000Z",
          contexts: ["morning"],
          note: "Should I increase my dose?"
        },
        {
          id: "reading-earlier-danger",
          patientId: "patient-1",
          systolic: 170,
          diastolic: 104,
          pulse: 76,
          measuredAt: "2026-07-05T10:00:00.000Z",
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
        state: stateWithBlockedLatestAndEarlierDanger
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.banner).toContain("call threshold");
    expect(response.sources).toContain("reading-earlier-danger");
    expect(response.sources).toContain("plan-1");
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it("escalates on an older chest-pain reading when a newer threshold reading exists", async () => {
    const stateWithOlderSymptomAndNewerThreshold = {
      ...demoState,
      readings: [thresholdReading, chestPainReading]
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
        state: stateWithOlderSymptomAndNewerThreshold
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.content).toContain("Some signs need urgent medical attention");
    expect(response.sources).toContain("reading-chest-pain-older");
    expect(response.sources).not.toContain("reading-threshold-later");
    expect(response.sources).not.toContain("plan-1");
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it("blocks earlier blocked reading classification when later reading is normal", async () => {
    const stateWithBlockedEarlierReading = {
      ...demoState,
      readings: [
        {
          id: "reading-latest",
          patientId: "patient-1",
          systolic: 128,
          diastolic: 82,
          pulse: 72,
          measuredAt: "2026-07-05T11:00:00.000Z",
          contexts: ["morning"],
          note: "Feeling okay now."
        },
        {
          id: "reading-blocked-previous",
          patientId: "patient-1",
          systolic: 120,
          diastolic: 80,
          pulse: 74,
          measuredAt: "2026-07-05T10:00:00.000Z",
          contexts: ["morning"],
          note: "Should I increase my dose?"
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
        patientInput: "What is my blood pressure target?",
        state: stateWithBlockedEarlierReading
      },
      provider
    );

    expect(response.safety).toBe("blocked");
    expect(response.banner).toContain("I cannot tell you to stop");
    expect(response.sources).toContain("reading-blocked-previous");
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it("allows education when a side effects barrier exists but the current question is safe", async () => {
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

    expect(response.safety).toBe("allowed");
    expect(response.content).toBe("This should not be called.");
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it("escalates when an active side effects barrier and current symptom concern are present", async () => {
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
        mode: "trouble",
        patientInput: "This medicine made me feel dizzy.",
        state: stateWithSideEffects
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.content).toContain("active side effects");
    expect(response.content).toContain("contact your care team");
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it("lets urgent symptom escalation win over side-effect medication barriers", async () => {
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
        mode: "trouble",
        patientInput: "I have chest pain",
        state: stateWithSideEffects
      },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.content).toContain("Some signs need urgent medical attention");
    expect(response.content).not.toContain("active side effects");
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it("answers the question with a banner instead of a broken record when a fresh high reading exists", async () => {
    const stateWithFreshHighReading = {
      ...demoState,
      readings: [
        {
          id: "reading-high",
          patientId: "patient-1",
          systolic: 162,
          diastolic: 101,
          pulse: 78,
          measuredAt: "2026-07-05T11:30:00.000Z",
          contexts: ["morning"],
          note: ""
        }
      ]
    };

    const response = await createSafeAiResponse(
      {
        mode: "explain",
        patientInput: "why do I have to take this if I feel fine?",
        state: stateWithFreshHighReading
      },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("escalate");
    expect(response.banner).toContain("call threshold");
    expect(response.actions).toEqual(expect.arrayContaining(["call_clinic", "draft_message"]));
    // The medicine question is still answered (default "explain" is inferred to "why").
    expect(response.content).toContain("Lisinopril");
  });

  it("blocks pause-for-a-week phrasing and still offers care-team actions", async () => {
    const response = await createSafeAiResponse(
      {
        mode: "explain",
        patientInput: "the cough is annoying, can I just stop the lisinopril for a week?",
        state: demoState
      },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("blocked");
    expect(response.banner).toContain("I cannot tell you to stop");
    expect(response.actions).toContain("call_clinic");
  });

  it("routes a self-harm disclosure to the crisis tier ahead of a dangerous stored reading", async () => {
    const state: AppState = { ...demoState, readings: [dangerousReadingAtNow] };
    const provider: HealthAiProvider = {
      respond: vi.fn().mockResolvedValue({
        content: "This should not be called.",
        safety: "allowed" as const,
        sources: ["plan-1"]
      })
    };

    const response = await createSafeAiResponse(
      { mode: "trouble", patientInput: "I want to die", state },
      provider
    );

    expect(response.safety).toBe("crisis");
    expect(response.content).toBe(tSafety("en", "crisisResponse"));
    expect(response.actions).toEqual(CRISIS_ACTIONS);
    expect(response.sources).toEqual([]);
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it("returns the Spanish crisis constant for a Spanish speaker", async () => {
    const state: AppState = {
      ...demoState,
      patient: { ...demoState.patient, language: "es" }
    };

    const response = await createSafeAiResponse(
      { mode: "trouble", patientInput: "no quiero estar aquí, I don't want to be here", state },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("crisis");
    expect(response.content).toBe(tSafety("es", "crisisResponse"));
  });

  it("does not let a co-mingled clinical question bury the crisis response", async () => {
    const provider: HealthAiProvider = {
      respond: vi.fn().mockResolvedValue({
        content: "Your blood pressure target is under 130/80.",
        safety: "allowed" as const,
        sources: ["plan-1"]
      })
    };

    const response = await createSafeAiResponse(
      { mode: "ask", patientInput: "I don't want to be here, also what is my BP?", state: demoState },
      provider
    );

    expect(response.safety).toBe("crisis");
    expect(response.content).toBe(tSafety("en", "crisisResponse"));
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it("does not escalate negated self-harm phrasing to a crisis", async () => {
    const response = await createSafeAiResponse(
      {
        mode: "explain",
        patientInput: "I would never hurt myself, I just want to understand my plan",
        state: demoState
      },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("allowed");
  });

  it("gives urgent symptoms an emergency-tier answer with a call 911 action", async () => {
    const provider: HealthAiProvider = {
      respond: vi.fn().mockResolvedValue({
        content: "This should not be called.",
        safety: "allowed" as const,
        sources: ["plan-1"]
      })
    };

    const response = await createSafeAiResponse(
      { mode: "trouble", patientInput: "I have chest pain", state: demoState },
      provider
    );

    expect(response.safety).toBe("escalate");
    expect(response.actions).toEqual(EMERGENCY_ACTIONS);
    expect(response.actions).toContain("call_emergency");
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it("escalates sudden vision loss to the emergency tier with a 911 action", async () => {
    const response = await createSafeAiResponse(
      { mode: "trouble", patientInput: "I suddenly cannot see out of my left eye", state: demoState },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("escalate");
    expect(response.actions).toContain("call_emergency");
  });

  it("keeps a side-effect escalation on the care-team tier", async () => {
    const stateWithSideEffects: AppState = {
      ...demoState,
      medications: [{ ...demoState.medications[0], activeBarriers: ["side_effects"] }]
    };

    const response = await createSafeAiResponse(
      { mode: "trouble", patientInput: "this medicine made me feel dizzy", state: stateWithSideEffects },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("escalate");
    expect(response.actions).toEqual(["call_clinic", "draft_message"]);
    expect(response.actions).not.toContain("call_emergency");
  });
});
