import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { tSafety } from "@/i18n/strings";
import { CARE_TEAM_ACTIONS, CRISIS_ACTIONS, EMERGENCY_ACTIONS } from "./safety-gate";
import { evaluateVoiceTranscript } from "./voice-gate";

describe("evaluateVoiceTranscript", () => {
  it("intercepts a self-harm disclosure to the crisis tier", () => {
    const decision = evaluateVoiceTranscript("I want to die", demoState, "en");

    expect(decision).toEqual({
      kind: "intercept",
      safety: "crisis",
      content: tSafety("en", "crisisResponse"),
      actions: CRISIS_ACTIONS
    });
  });

  it("intercepts a spoken word-form dangerous reading to the emergency tier", () => {
    const decision = evaluateVoiceTranscript("my pressure is one eighty over one twenty", demoState, "en");

    expect(decision.kind).toBe("intercept");
    if (decision.kind === "intercept") {
      expect(decision.safety).toBe("escalate");
      expect(decision.actions).toEqual(EMERGENCY_ACTIONS);
    }
  });

  it("intercepts a digit 'over' dangerous reading", () => {
    const decision = evaluateVoiceTranscript("it says 200 over 130", demoState, "en");

    expect(decision.kind).toBe("intercept");
    if (decision.kind === "intercept") {
      expect(decision.safety).toBe("escalate");
    }
  });

  it("soft-blocks a spoken medication-change request", () => {
    const decision = evaluateVoiceTranscript("should I stop taking my metformin?", demoState, "en");

    expect(decision.kind).toBe("intercept");
    if (decision.kind === "intercept") {
      expect(decision.safety).toBe("blocked");
      expect(decision.actions).toEqual(CARE_TEAM_ACTIONS);
    }
  });

  it("passes a routine food question", () => {
    expect(evaluateVoiceTranscript("is this soup okay for me?", demoState, "en")).toEqual({ kind: "pass" });
  });

  it("passes negated self-harm phrasing", () => {
    expect(evaluateVoiceTranscript("I would never hurt myself", demoState, "en")).toEqual({ kind: "pass" });
  });
});
