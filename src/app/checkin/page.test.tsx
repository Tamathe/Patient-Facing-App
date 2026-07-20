import { render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";
import CheckinPage from "./page";

const { context } = vi.hoisted(() => ({ context: { state: {} as AppState, dispatch: vi.fn() } }));

vi.mock("@/state/store", () => ({ useHealthState: () => context }));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  )
}));

describe("screening hub", () => {
  beforeEach(() => {
    context.state = demoState;
  });

  it("shows the due PHQ-9, quick-check placeholder, and empty history in English", () => {
    render(<CheckinPage />);

    expect(screen.getByRole("heading", { name: "Screening hub" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Due now" })).toBeVisible();
    expect(screen.getByRole("link", { name: /PHQ-9 mood check-in/i })).toHaveAttribute("href", "/checkin/phq9");
    expect(screen.getByRole("heading", { name: "Quick check" })).toBeVisible();
    expect(screen.getByText("Coming soon")).toBeVisible();
    expect(screen.getByRole("region", { name: "History" })).toHaveTextContent("No completed check-ins yet.");
    expect(screen.queryByRole("link", { name: "Family support" })).not.toBeInTheDocument();
  });

  it("localizes the hub, conditionally shows family support, and orders history newest first", () => {
    context.state = {
      ...demoState,
      patient: { ...demoState.patient, language: "es" },
      family: {
        profile: null,
        interviewDraft: "",
        screenAnswers: [],
        interviews: [],
        facts: [],
        latestInterviewDomains: [],
        activeDomains: [],
        saved: [],
        alreadyEnrolled: []
      },
      assessmentEvents: [
        {
          id: "older",
          patientId: demoState.patient.id,
          instrumentId: "phq9",
          itemResponses: Array(9).fill(0),
          totalScore: 0,
          severityBand: "minimal",
          status: "patient_reported",
          recordedAt: "2026-06-01T12:00:00.000Z"
        },
        {
          id: "newer",
          patientId: demoState.patient.id,
          instrumentId: "phq9",
          itemResponses: Array(9).fill(1),
          totalScore: 9,
          severityBand: "mild",
          status: "patient_reported",
          recordedAt: "2026-07-01T12:00:00.000Z"
        }
      ]
    };

    render(<CheckinPage />);

    expect(screen.getByRole("heading", { name: "Centro de chequeos" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Apoyo familiar" })).toHaveAttribute("href", "/family");
    const history = screen.getByRole("region", { name: "Historial" });
    const dates = within(history).getAllByText(/2026/).map((element) => element.getAttribute("dateTime"));
    expect(dates).toEqual(["2026-07-01T12:00:00.000Z", "2026-06-01T12:00:00.000Z"]);
  });
});
