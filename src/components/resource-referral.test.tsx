import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ResourceReferral } from "./resource-referral";
import { getKentuckyResourceById } from "@/domain/sdoh-resources";

const resource = getKentuckyResourceById("kentucky_211_statewide")!;

describe("ResourceReferral", () => {
  it("requires per-referral consent before the share fires", async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    render(<ResourceReferral resource={resource} language="en" onShare={onShare} />);

    const shareButton = screen.getByRole("button", { name: /Share this referral/ });
    expect(shareButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(shareButton).not.toBeDisabled();

    await user.click(shareButton);
    expect(onShare).toHaveBeenCalledWith(resource);
  });
});
