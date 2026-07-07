import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ScreeningBooked } from "./screening-booked";

function renderBooked(overrides: Partial<React.ComponentProps<typeof ScreeningBooked>> = {}) {
  return render(
    <ScreeningBooked
      county="Perry"
      language="en"
      onShareReferral={vi.fn()}
      rideSupport={false}
      siteName="Perry County FQHC Mobile Camera"
      when="Tuesday 2:40 PM"
      {...overrides}
    />
  );
}

describe("ScreeningBooked", () => {
  it("confirms the booking and kills the fear with what-to-expect", () => {
    renderBooked();

    expect(screen.getByText(/Eye screening — Perry County FQHC Mobile Camera, Tuesday 2:40 PM/)).toBeInTheDocument();
    expect(
      screen.getByText("About 10 minutes. Usually no dilation. No air puff. You'll know before you leave.")
    ).toBeInTheDocument();
    expect(screen.getByText("Do you have a way to get there?")).toBeInTheDocument();
  });

  it("turns a no-ride answer into county transportation referrals", async () => {
    const user = userEvent.setup();
    renderBooked();

    await user.click(screen.getByRole("button", { name: "I need help with a ride" }));

    expect(screen.getByText("Transportation help near you")).toBeInTheDocument();
    expect(screen.getByText("LKLP Community Action Council transportation")).toBeInTheDocument();
  });

  it("notes site ride support when the patient already has a ride", async () => {
    const user = userEvent.setup();
    renderBooked({ rideSupport: true });

    await user.click(screen.getByRole("button", { name: "Yes, I have a ride" }));

    expect(screen.getByText(/This site offers ride support/)).toBeInTheDocument();
  });
});
