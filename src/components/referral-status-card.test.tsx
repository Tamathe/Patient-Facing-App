import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { ReferralStatusCard } from "./referral-status-card";
import { getDestinationById } from "@/domain/screening-sites";
import type { Referral } from "@/domain/types";

const baseReferral: Referral = {
  id: "referral-1",
  resultId: "result-1",
  tier: "optometry_routine",
  destinationId: "dest_hazard_optometry",
  stageHistory: [
    { stage: "drafted", at: "2026-07-07T10:00:00.000Z", note: "Drafted from your confirmed report" },
    { stage: "sent", at: "2026-07-07T10:00:00.000Z", note: "Sent to Hazard Optometry Associates" }
  ],
  sentAt: "2026-07-07T10:00:00.000Z"
};

const destination = getDestinationById("dest_hazard_optometry")!;

describe("ReferralStatusCard", () => {
  it("says where the referral went and when to expect the call (5 days routine)", () => {
    render(<ReferralStatusCard destination={destination} language="en" referral={baseReferral} />);

    expect(
      screen.getByText(/Your referral went to Hazard Optometry Associates \(Optometrist\), 2 mi — expect a call within 5 days\./)
    ).toBeInTheDocument();
  });

  it("uses the 2-day window for a retina-urgent referral", () => {
    const retina = getDestinationById("dest_uk_retina")!;
    render(
      <ReferralStatusCard
        destination={retina}
        language="en"
        referral={{ ...baseReferral, tier: "retina_urgent", destinationId: "dest_uk_retina" }}
      />
    );

    expect(screen.getByText(/expect a call within 2 days/)).toBeInTheDocument();
    expect(screen.getByText(/Retina specialist/)).toBeInTheDocument();
  });

  it("renders the honest stage timeline with the current stage highlighted", () => {
    render(<ReferralStatusCard destination={destination} language="en" referral={baseReferral} />);

    expect(screen.getByText("Drafted")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("Clinic confirmed")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("We're on it — your care team has been notified.")).not.toBeInTheDocument();
  });

  it("shows the we're-on-it notice for a stalled referral", () => {
    const stalled: Referral = {
      ...baseReferral,
      stageHistory: [
        ...baseReferral.stageHistory,
        { stage: "stalled", at: "2026-07-12T10:00:00.000Z", note: "No confirmation call yet" }
      ]
    };
    render(<ReferralStatusCard destination={destination} language="en" referral={stalled} />);

    expect(screen.getByText("We're on it — your care team has been notified.")).toBeInTheDocument();
  });
});
