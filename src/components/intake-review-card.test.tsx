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

  it("displays confidence and status", () => {
    render(
      <IntakeReviewCard
        fact={{
          id: "fact-1",
          contextItemId: "ctx-1",
          label: "Home monitoring",
          value: "Check blood pressure at home",
          confidence: "high",
          status: "needs_review",
          sourceSnippet: "Monitor BP daily"
        }}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Confidence: high")).toBeInTheDocument();
    expect(screen.getByText("Status: Needs Review")).toBeInTheDocument();
  });

  it("shows confirmed state", () => {
    render(
      <IntakeReviewCard
        fact={{
          id: "fact-1",
          contextItemId: "ctx-1",
          label: "Follow-up timing",
          value: "Follow up with care team",
          confidence: "low",
          status: "confirmed",
          sourceSnippet: "Follow up next month"
        }}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Confirmed" })).toBeDisabled();
    expect(screen.getByText("Status: Confirmed")).toBeInTheDocument();
  });
});
