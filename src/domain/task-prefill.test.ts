import { describe, expect, it } from "vitest";
import { prefilledMessageForTask } from "./task-prefill";
import { createSafeAiResponse } from "@/ai/safety-gate";
import { MockHealthAiProvider } from "@/ai/mock-provider";
import { demoState } from "./fixtures";
import type { AppState, HomeReading } from "./types";

function withReading(reading: Partial<HomeReading>): AppState {
  const base: HomeReading = {
    id: "r-test",
    patientId: demoState.patient.id,
    systolic: 120,
    diastolic: 80,
    pulse: 70,
    measuredAt: new Date().toISOString(),
    contexts: [],
    note: ""
  };
  return { ...demoState, readings: [...demoState.readings, { ...base, ...reading }] };
}

describe("prefilledMessageForTask", () => {
  it("builds a message carrying the actual reading numbers", () => {
    const state = withReading({ id: "r-danger", systolic: 188, diastolic: 121 });
    const prefill = prefilledMessageForTask("task-bp-clinical", state);
    expect(prefill?.input).toContain("188/121");
  });

  it("returns null for an unknown task id", () => {
    expect(prefilledMessageForTask("task-unknown", demoState)).toBeNull();
  });

  it("returns a care-team message for a medication barrier", () => {
    const prefill = prefilledMessageForTask("task-med-barrier", demoState);
    expect(prefill?.input).toMatch(/medicine/i);
  });

  it("re-screens the prefilled dangerous reading through the safety gate", async () => {
    const state = withReading({ id: "r-danger", systolic: 188, diastolic: 121 });
    const prefill = prefilledMessageForTask("task-bp-clinical", state);
    expect(prefill).not.toBeNull();

    const response = await createSafeAiResponse(
      { mode: prefill!.mode, patientInput: prefill!.input, state },
      new MockHealthAiProvider()
    );

    // The prefill is treated as real patient input, so a dangerous reading still
    // hard-escalates rather than reaching a normal coaching answer.
    expect(response.safety).toBe("escalate");
  });
});
