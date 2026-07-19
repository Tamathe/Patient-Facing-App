import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { FamilyFollowUpTurn } from "./family-follow-up-turn";

const question = {
  question: "What has the school offered so far?",
  options: ["Nothing yet", "A meeting is planned", "An evaluation was done"]
};

describe("FamilyFollowUpTurn", () => {
  it("renders suggested answers and submits a chip answer", () => {
    const onAnswer = vi.fn();
    render(
      <FamilyFollowUpTurn
        question={question}
        round={1}
        roundCap={2}
        language="en"
        submitting={false}
        onAnswer={onAnswer}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "A meeting is planned" }));
    expect(onAnswer).toHaveBeenCalledWith("A meeting is planned", "chip");
  });

  it("rejects empty free text and accepts a short typed answer", () => {
    const onAnswer = vi.fn();
    render(
      <FamilyFollowUpTurn
        question={question}
        round={1}
        roundCap={2}
        language="en"
        submitting={false}
        onAnswer={onAnswer}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add answer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an answer before continuing.");
    expect(onAnswer).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: "Or type a short answer" }), { target: { value: "No" } });
    fireEvent.click(screen.getByRole("button", { name: "Add answer" }));
    expect(onAnswer).toHaveBeenCalledWith("No", "typed");
  });

  it("announces the round counter", () => {
    render(
      <FamilyFollowUpTurn
        question={question}
        round={2}
        roundCap={2}
        language="en"
        submitting={false}
        onAnswer={vi.fn()}
      />
    );

    expect(screen.getByText("Question 2 of 2")).toHaveAttribute("aria-live", "polite");
  });
});
