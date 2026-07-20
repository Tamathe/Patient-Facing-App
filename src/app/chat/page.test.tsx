import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";
import type { HealthAction } from "@/state/store";
import type { VoiceSafetyIntercept } from "@/hooks/use-food-voice-session";
import ChatPage from "./page";

type HookArgs = {
  onFinalTranscript: (role: "patient" | "assistant", text: string) => void;
  onSafetyIntercept: (intercept: VoiceSafetyIntercept) => void;
};

const mocks = vi.hoisted(() => ({
  consentRequired: false,
  dispatch: vi.fn(),
  grantConsent: vi.fn(),
  onSessionStart: vi.fn(),
  start: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
  state: null as AppState | null,
  voiceArgs: null as HookArgs | null
}));

vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/state/store", () => ({ useHealthState: () => ({ state: mocks.state, dispatch: mocks.dispatch }) }));
vi.mock("@/hooks/use-chat-voice-session", () => ({
  useChatVoiceSession: (args: HookArgs) => {
    mocks.voiceArgs = args;
    return {
      mode: "live",
      status: "idle",
      partialAssistantText: "",
      error: null,
      start: mocks.start,
      stop: mocks.stop
    };
  }
}));
vi.mock("@/voice/voice-consent", () => ({
  useVoiceEntry: () => ({
    consentRequired: mocks.consentRequired,
    grantConsent: mocks.grantConsent,
    onSessionStart: mocks.onSessionStart
  })
}));

function applyAction(action: HealthAction): void {
  const state = mocks.state as AppState;
  if (action.type === "addAiMessage") {
    mocks.state = { ...state, aiMessages: [...state.aiMessages, action.message] };
  } else if (action.type === "acknowledgeCrisis") {
    mocks.state = {
      ...state,
      aiMessages: state.aiMessages.map((message) => message.id === action.messageId ? { ...message, acknowledged: true } : message)
    };
  }
}

beforeEach(() => {
  mocks.consentRequired = false;
  mocks.state = { ...demoState, aiMessages: [] };
  mocks.voiceArgs = null;
  mocks.dispatch.mockReset();
  mocks.dispatch.mockImplementation(applyAction);
  mocks.grantConsent.mockClear();
  mocks.onSessionStart.mockClear();
  mocks.start.mockClear();
  mocks.stop.mockClear();
  window.history.replaceState(null, "", "/chat");
});

describe("ChatPage live voice", () => {
  it("starts after consent and records the shared voice audit event", async () => {
    mocks.consentRequired = true;
    render(<ChatPage />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice coach" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "I understand, use voice" })));
    expect(mocks.grantConsent).toHaveBeenCalled();
    expect(mocks.onSessionStart).toHaveBeenCalledWith("chat");
    expect(mocks.start).toHaveBeenCalled();
  });

  it("appends final voice turns and lets a crisis intercept engage the panel lock", () => {
    const view = render(<ChatPage />);
    act(() => {
      mocks.voiceArgs?.onFinalTranscript("patient", "Can you explain my plan?");
      mocks.voiceArgs?.onFinalTranscript("assistant", "Your plan focuses on steady daily steps.");
    });
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "addAiMessage",
      message: expect.objectContaining({ mode: "ask", role: "patient", safety: "allowed" })
    }));
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "addAiMessage",
      message: expect.objectContaining({ mode: "ask", role: "assistant", safety: "allowed" })
    }));

    act(() => mocks.voiceArgs?.onSafetyIntercept({
      safety: "crisis",
      content: "Please get support now.",
      actions: ["crisis_call_988"]
    }));
    view.rerender(<ChatPage />);
    expect(screen.queryByRole("button", { name: "Start voice coach" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();
    expect(mocks.stop).toHaveBeenCalled();
  });
});
