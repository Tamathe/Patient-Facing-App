import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { ReferralPacketView } from "./referral-packet-view";
import { getDestinationById } from "@/domain/screening-sites";
import type { Referral, ScreeningGap, ScreeningResult } from "@/domain/types";

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
  stageHistory: [
    { stage: "drafted", at: "2026-07-07T10:00:00.000Z", note: "" },
    { stage: "sent", at: "2026-07-07T10:00:00.000Z", note: "" }
  ],
  sentAt: "2026-07-07T10:00:00.000Z"
};

const gap: ScreeningGap = {
  id: "gap-1",
  condition: "diabetes",
  status: "referral",
  lastScreeningDate: "2024-12-01",
  scheduledSiteId: "site_fqhc_mobile",
  scheduledFor: "Tuesday 2:40 PM"
};

describe("ReferralPacketView", () => {
  it("renders the packet fields with the DEMO watermark and honesty footnote", () => {
    render(
      <ReferralPacketView
        destination={getDestinationById("dest_hazard_optometry")!}
        gap={gap}
        language="en"
        patientName="Jordan Taylor"
        referral={referral}
        result={result}
      />
    );

    expect(screen.getByText("Referral packet")).toBeInTheDocument();
    expect(screen.getByText("Jordan Taylor")).toBeInTheDocument();
    expect(screen.getByText(/Your report shows changes that need a closer look/)).toBeInTheDocument();
    expect(screen.getByText("Routine — optometry")).toBeInTheDocument();
    expect(screen.getByText(/Hazard Optometry Associates — Hazard/)).toBeInTheDocument();
    expect(screen.getByText(/Perry County FQHC Mobile Camera/)).toBeInTheDocument();
    expect(screen.getByText("DEMO PACKET")).toBeInTheDocument();
    expect(screen.getByText(/A real referral would also include/)).toBeInTheDocument();
  });
});
