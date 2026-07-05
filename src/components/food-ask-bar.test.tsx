import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { FoodAskBar } from "./food-ask-bar";

describe("FoodAskBar", () => {
  it("shows a start button before a session begins", () => {
    render(<FoodAskBar mode="unknown" status="idle" onStart={() => {}} onStop={() => {}} onSendText={() => {}} language="en" />);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("submits typed questions in mock mode and clears the input", async () => {
    const onSendText = vi.fn();
    const user = userEvent.setup();
    render(<FoodAskBar mode="mock" status="listening" onStart={() => {}} onStop={() => {}} onSendText={onSendText} language="en" />);

    expect(screen.getByText(/type your question/i)).toBeInTheDocument();
    const input = screen.getByLabelText("Ask about this food…");
    await user.type(input, "Can I have this?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(onSendText).toHaveBeenCalledWith("Can I have this?");
    expect(input).toHaveValue("");
  });

  it("disables asking while thinking", () => {
    render(<FoodAskBar mode="mock" status="thinking" onStart={() => {}} onStop={() => {}} onSendText={() => {}} language="en" />);
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
  });

  it("shows the end button in live mode", () => {
    render(<FoodAskBar mode="live" status="listening" onStart={() => {}} onStop={() => {}} onSendText={() => {}} language="en" />);
    expect(screen.getByRole("button", { name: "End" })).toBeInTheDocument();
  });
});
