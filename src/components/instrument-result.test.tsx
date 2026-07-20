import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRISIS_ACTIONS } from "@/ai/safety-gate";
import { PHQ9_INSTRUMENT } from "@/domain/instruments/phq9";
import { tSafety } from "@/i18n/strings";
import { InstrumentResult } from "./instrument-result";

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock("@/state/store", () => ({
  useHealthState: () => ({
    state: { patient: { id: "patient-1", language: "en" } },
    dispatch
  })
}));

describe("InstrumentResult", () => {
  beforeEach(() => dispatch.mockReset());

  it("records a positive-item event, dispatches the shared crisis message, and replaces the band summary", async () => {
    render(
      <InstrumentResult
        instrument={PHQ9_INSTRUMENT}
        language="en"
        responses={[0, 0, 0, 0, 0, 0, 0, 0, 1]}
      />
    );

    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2));
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: "addAssessmentEvent",
      event: {
        patientId: "patient-1",
        instrumentId: "phq9",
        itemResponses: [0, 0, 0, 0, 0, 0, 0, 0, 1],
        totalScore: 1,
        severityBand: "minimal",
        status: "patient_reported"
      }
    });
    expect(dispatch.mock.calls[1][0]).toMatchObject({
      type: "addAiMessage",
      message: {
        role: "assistant",
        content: tSafety("en", "crisisResponse"),
        safety: "crisis",
        actions: CRISIS_ACTIONS
      }
    });
    expect(screen.getByRole("link", { name: /Call 988/i })).toHaveAttribute("href", "tel:988");
    expect(screen.getByRole("link", { name: /Text 988/i })).toHaveAttribute("href", "sms:988");
    expect(screen.getByRole("link", { name: /Call 911/i })).toHaveAttribute("href", "tel:911");
    expect(screen.queryByText(/few or no signs/i)).not.toBeInTheDocument();
  });

  it("records a non-crisis result and renders its localized band summary", async () => {
    render(
      <InstrumentResult
        instrument={PHQ9_INSTRUMENT}
        language="es"
        responses={[0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/pocas o ninguna señal/i)).toBeVisible();
    expect(screen.queryByRole("link", { name: /988/i })).not.toBeInTheDocument();
  });
});
