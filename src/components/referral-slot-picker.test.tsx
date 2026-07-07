import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ReferralSlotPicker } from "./referral-slot-picker";
import { getDestinationById } from "@/domain/screening-sites";
import type { Referral } from "@/domain/types";

const destination = getDestinationById("dest_hazard_optometry")!;

const baseReferral: Referral = {
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

function renderPicker(referral: Referral, overrides: Partial<React.ComponentProps<typeof ReferralSlotPicker>> = {}) {
  const onBookSlot = vi.fn();
  const onWent = vi.fn();
  render(
    <ReferralSlotPicker
      county="Perry"
      destination={destination}
      language="en"
      onBookSlot={onBookSlot}
      onShareReferral={vi.fn()}
      onWent={onWent}
      referral={referral}
      {...overrides}
    />
  );
  return { onBookSlot, onWent };
}

describe("ReferralSlotPicker", () => {
  it("offers three slots, soonest first, before anything is scheduled", async () => {
    const user = userEvent.setup();
    const { onBookSlot } = renderPicker(baseReferral);

    expect(screen.getByText("Or pick a time now:")).toBeInTheDocument();
    const slotButtons = screen.getAllByRole("button", { name: /Jul/ });
    expect(slotButtons).toHaveLength(3);
    expect(slotButtons[0]).toHaveTextContent("Tue Jul 14 · 9:20 AM");

    await user.click(slotButtons[0]);
    expect(onBookSlot).toHaveBeenCalledWith("Tue Jul 14 · 9:20 AM");
  });

  it("shows the coverage note, ride re-ask, and self-report closure once scheduled", async () => {
    const user = userEvent.setup();
    const scheduled: Referral = {
      ...baseReferral,
      scheduledFor: "Tue Jul 14 · 9:20 AM",
      stageHistory: [...baseReferral.stageHistory, { stage: "scheduled", at: "2026-07-07T11:00:00.000Z", note: "" }]
    };
    const { onWent } = renderPicker(scheduled);

    expect(screen.getByText("Booked: Tue Jul 14 · 9:20 AM")).toBeInTheDocument();
    expect(screen.getByText(/Most Kentucky Medicaid MCO plans cover this visit/)).toBeInTheDocument();
    expect(screen.getByText("Need a ride that day?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "I need help with a ride" }));
    expect(screen.getByText("LKLP Community Action Council transportation")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "I went to this appointment" }));
    expect(onWent).toHaveBeenCalledTimes(1);
  });

  it("marks the visit as self-reported once completed", () => {
    const completed: Referral = {
      ...baseReferral,
      scheduledFor: "Tue Jul 14 · 9:20 AM",
      stageHistory: [
        ...baseReferral.stageHistory,
        { stage: "scheduled", at: "2026-07-07T11:00:00.000Z", note: "" },
        { stage: "completed", at: "2026-07-14T14:00:00.000Z", note: "Self-reported by you" }
      ]
    };
    renderPicker(completed);

    expect(screen.queryByRole("button", { name: "I went to this appointment" })).not.toBeInTheDocument();
    expect(screen.getByText(/Self-reported by you/)).toBeInTheDocument();
  });

  it("keeps the expect-a-call path for a destination with no published slots", () => {
    const { container } = render(
      <ReferralSlotPicker
        county="Perry"
        destination={{ ...destination, nextSlots: [] }}
        language="en"
        onBookSlot={vi.fn()}
        onShareReferral={vi.fn()}
        onWent={vi.fn()}
        referral={baseReferral}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
