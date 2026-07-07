import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ScreeningNudge } from "./screening-nudge";

const nudgeMessage =
  "Hi Jordan — it's been 19 months since your last diabetes eye check. A new photo takes about 10 minutes, close to home.";

describe("ScreeningNudge", () => {
  it("renders the carrier-style bubble and the giant CTA", () => {
    render(
      <ScreeningNudge callbackMessage="For my care team: call me." language="en" nudgeMessage={nudgeMessage} onSeeTimes={vi.fn()} />
    );

    expect(screen.getByText(nudgeMessage)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /See times near me/ })).toBeInTheDocument();
  });

  it("fires onSeeTimes from the primary action", async () => {
    const user = userEvent.setup();
    const onSeeTimes = vi.fn();
    render(
      <ScreeningNudge callbackMessage="For my care team: call me." language="en" nudgeMessage={nudgeMessage} onSeeTimes={onSeeTimes} />
    );

    await user.click(screen.getByRole("button", { name: /See times near me/ }));
    expect(onSeeTimes).toHaveBeenCalledTimes(1);
  });

  it("drafts the care-team callback instead of a fake queue", async () => {
    const user = userEvent.setup();
    render(
      <ScreeningNudge
        callbackMessage={"For my care team:\n- Please call me about my eye check."}
        language="en"
        nudgeMessage={nudgeMessage}
        onSeeTimes={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "I'd rather talk to someone" }));

    expect(screen.getByText("A message for your care team is ready")).toBeInTheDocument();
    expect(screen.getByText(/Please call me about my eye check/)).toBeInTheDocument();
  });
});
