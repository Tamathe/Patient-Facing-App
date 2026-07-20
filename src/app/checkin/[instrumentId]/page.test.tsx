import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";
import InstrumentPage from "./page";

const { route, context } = vi.hoisted(() => ({
  route: { instrumentId: "phq9" },
  context: { state: {} as AppState, dispatch: vi.fn() }
}));

vi.mock("next/navigation", () => ({ useParams: () => route }));
vi.mock("@/state/store", () => ({ useHealthState: () => context }));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  )
}));

describe("dynamic instrument route", () => {
  beforeEach(() => {
    route.instrumentId = "phq9";
    context.state = demoState;
    context.dispatch.mockReset();
  });

  it("loads a known instrument through the generic runner", () => {
    render(<InstrumentPage />);
    expect(screen.getByRole("heading", { name: "PHQ-9 mood check-in" })).toBeVisible();
    expect(screen.getByRole("button", { name: /start the check-in/i })).toBeVisible();
  });

  it("renders a bilingual-safe unavailable state for an unknown id", () => {
    route.instrumentId = "not-real";
    render(<InstrumentPage />);
    expect(screen.getByText("This check-in is not available.")).toBeVisible();
  });

  it("prefills current tobacco history so the lung route shows four questions and stores all six positions", async () => {
    const user = userEvent.setup();
    route.instrumentId = "lung_ldct_eligibility";
    context.state = {
      ...demoState,
      assessmentEvents: [
        {
          id: "tobacco-current",
          patientId: demoState.patient.id,
          instrumentId: "tobacco_use",
          itemResponses: [2, -1],
          totalScore: 2,
          severityBand: "current",
          status: "patient_reported",
          recordedAt: "2026-07-20T12:00:00.000Z"
        }
      ]
    };

    render(<InstrumentPage />);
    await user.click(screen.getByRole("button", { name: "I understand — start" }));

    expect(screen.queryByText("Do you currently smoke cigarettes, or did you smoke cigarettes in the past?")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "How many full months ago did you quit smoking?" })).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "How old are you?" })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: /how many packs/i })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: /For how many years/i })).toBeVisible();
    expect(screen.getByText("Have you coughed up blood or lost weight without trying?")).toBeVisible();

    await user.type(screen.getByRole("spinbutton", { name: "How old are you?" }), "60");
    await user.type(screen.getByRole("spinbutton", { name: /how many packs/i }), "1");
    await user.type(screen.getByRole("spinbutton", { name: /For how many years/i }), "20");
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(context.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "addAssessmentEvent",
      event: expect.objectContaining({
        instrumentId: "lung_ldct_eligibility",
        itemResponses: [1, 60, 1, 20, -1, 0],
        totalScore: 20,
        severityBand: "eligible"
      })
    })));
  });
});
