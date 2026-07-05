import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationPanel } from "./conversation-panel";
import type { AiMessage } from "@/domain/types";
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

  it("renders safety guidance labels on messages", () => {
    const messages: AiMessage[] = [
      {
        id: "0",
        mode: "explain",
        role: "patient",
        content: "Could you explain why blood pressure matters?",
        createdAt: "2026-07-05T11:59:59.000Z",
        safety: "allowed",
        sources: []
      },
      {
        id: "1",
        mode: "explain",
        role: "assistant",
        content: "You're taking this medication for blood pressure.",
        createdAt: "2026-07-05T12:00:00.000Z",
        safety: "allowed",
        sources: []
      },
      {
        id: "2",
        mode: "trouble",
        role: "assistant",
        content: "Please contact your care team right away.",
        createdAt: "2026-07-05T12:00:01.000Z",
        safety: "escalate",
        sources: []
      },
      {
        id: "3",
        mode: "why",
        role: "assistant",
        content: "I can't help with that request.",
        createdAt: "2026-07-05T12:00:02.000Z",
        safety: "blocked",
        sources: []
      }
    ];

    render(<ConversationPanel onSubmit={vi.fn()} messages={messages} />);

    expect(screen.getAllByText("Safety guidance: Safe to continue")).toHaveLength(1);
    expect(screen.getByText("Safety guidance: Safe to continue")).toBeInTheDocument();
    expect(screen.getByText("Safety guidance: Escalate to care now")).toBeInTheDocument();
    expect(screen.getByText("Safety guidance: Blocked for safety")).toBeInTheDocument();
  });

  it("renders a banner, call/draft actions, and humanized sources for a soft escalation", () => {
    const messages: AiMessage[] = [
      {
        id: "a",
        mode: "why",
        role: "assistant",
        content: "Lisinopril helps lower your blood pressure.",
        createdAt: "2026-07-05T12:00:00.000Z",
        safety: "escalate",
        sources: ["med-1", "plan-1"],
        banner: "This reading meets the call threshold in your plan.",
        actions: ["call_clinic", "draft_message"]
      }
    ];

    render(
      <ConversationPanel
        onSubmit={vi.fn()}
        messages={messages}
        clinic={{ name: "Bluegrass Primary Care", phone: "555-0142" }}
        careTeamDraft="For my care team: ..."
        describeSource={(id) => (id === "med-1" ? "Lisinopril" : id === "plan-1" ? "your care plan" : null)}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("call threshold");
    expect(screen.getByRole("link", { name: /Call Bluegrass Primary Care/ })).toHaveAttribute("href", "tel:555-0142");
    expect(screen.getByRole("button", { name: "Draft a message" })).toBeInTheDocument();
    expect(screen.getByText("Based on Lisinopril, your care plan.")).toBeInTheDocument();
  });
});
