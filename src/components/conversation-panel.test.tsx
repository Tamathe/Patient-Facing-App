import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationPanel } from "./conversation-panel";
import React from "react";

describe("ConversationPanel", () => {
  it("submits patient input with the selected mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ConversationPanel onSubmit={onSubmit} messages={[]} />);

    await user.click(screen.getByRole("button", { name: "Why does this matter?" }));
    await user.type(screen.getByLabelText("Message"), "Why am I taking lisinopril?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith("why", "Why am I taking lisinopril?");
  });
});
