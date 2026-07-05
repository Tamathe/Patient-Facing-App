import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { IntakeReviewCard } from "./intake-review-card";

describe("IntakeReviewCard", () => {
  it("calls onConfirm when the user confirms a fact", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <IntakeReviewCard
        fact={{
          id: "fact-1",
          contextItemId: "ctx-1",
          label: "Home monitoring",
          value: "Check blood pressure at home",
          confidence: "medium",
          status: "needs_review",
          sourceSnippet: "Monitor BP daily"
        }}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
