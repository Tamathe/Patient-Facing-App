import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { ScreeningJourney } from "./screening-journey";
import type { Referral, ScreeningResult } from "@/domain/types";

const result: ScreeningResult = {
  id: "result-1",
  gapId: "gap-1",
  outcome: "abnormal",
  grade: "moderate_npdr",
  dmePresent: false,
  source: "photo_report",
  reportRef: "report-moderate-npdr.svg",
  confirmedAt: "2026-07-07T10:00:00.000Z"
};

const referral: Referral = {
  id: "referral-1",
  resultId: "result-1",
  tier: "optometry_routine",
  destinationId: "dest_hazard_optometry",
  scheduledFor: "Tue Jul 14 · 9:20 AM",
  stageHistory: [
    { stage: "drafted", at: "2026-07-07T10:00:00.000Z", note: "" },
    { stage: "sent", at: "2026-07-07T10:00:00.000Z", note: "" },
    { stage: "scheduled", at: "2026-07-08T10:00:00.000Z", note: "" }
  ],
  sentAt: "2026-07-07T10:00:00.000Z"
};

describe("ScreeningJourney", () => {
  it("renders the closed-loop summary through the booked stage", () => {
    render(<ScreeningJourney language="en" referral={referral} result={result} />);

    expect(screen.getByText("Your eye-care loop")).toBeInTheDocument();
    expect(screen.getByText(/Screened/)).toBeInTheDocument();
    expect(screen.getByText("Referral sent")).toBeInTheDocument();
    expect(screen.getByText(/Scheduled Tue Jul 14/)).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
