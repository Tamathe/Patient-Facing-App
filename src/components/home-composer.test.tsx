import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeComposer, NAV_CONFIRM_MS } from "./home-composer";

const mocks = vi.hoisted(() => ({
  classifyRouteRemote: vi.fn(),
  finalTranscript: null as ((text: string) => void) | null,
  language: "en" as "en" | "es",
  push: vi.fn(),
  speak: vi.fn(() => Promise.resolve()),
  start: vi.fn(),
  stop: vi.fn(),
  stopSpeaking: vi.fn()
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/ai/route-classifier-client", () => ({ classifyRouteRemote: mocks.classifyRouteRemote }));
vi.mock("@/state/store", async () => {
  const { demoState } = await vi.importActual<typeof import("@/domain/fixtures")>("@/domain/fixtures");
  return {
    useHealthState: () => ({
      state: { ...demoState, patient: { ...demoState.patient, language: mocks.language } },
      dispatch: vi.fn()
    })
  };
});
vi.mock("@/voice/use-dictation", () => ({
  useDictation: ({ onFinalTranscript }: { onFinalTranscript: (text: string) => void }) => {
    mocks.finalTranscript = onFinalTranscript;
    return { supported: true, listening: false, start: mocks.start, stop: mocks.stop };
  }
}));
vi.mock("@/voice/voice-consent", () => ({
  useVoiceEntry: () => ({ consentRequired: false, grantConsent: vi.fn(), onSessionStart: vi.fn() })
}));
vi.mock("@/voice/tts", () => ({
  isSpeaking: () => false,
  speak: mocks.speak,
  stopSpeaking: mocks.stopSpeaking,
  subscribeSpeaking: () => () => undefined
}));

function type(value: string): void {
  const input = screen.getByLabelText(/tell me what you need/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
}

async function say(value: string): Promise<void> {
  await act(async () => {
    mocks.finalTranscript?.(value);
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.push.mockClear();
  mocks.speak.mockClear();
  mocks.start.mockClear();
  mocks.stop.mockClear();
  mocks.stopSpeaking.mockClear();
  mocks.language = "en";
  mocks.classifyRouteRemote.mockReset();
  mocks.classifyRouteRemote.mockResolvedValue({ kind: "coach", confidence: 0 });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("HomeComposer", () => {
  it("routes a typed deterministic verb straight to the feature screen with no voice delay", async () => {
    render(<HomeComposer />);
    type("log my blood pressure");
    expect(mocks.push).toHaveBeenCalledWith("/numbers");
    expect(mocks.classifyRouteRemote).not.toHaveBeenCalled();
    expect(mocks.speak).not.toHaveBeenCalled();
  });

  it("sends crisis text to the Coach and never to the LLM", async () => {
    render(<HomeComposer />);
    type("I want to die");
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("/chat?ask="));
    expect(mocks.classifyRouteRemote).not.toHaveBeenCalled();
  });

  it("sends a caregiver-voice crisis to the Coach and never to feature classification", async () => {
    render(<HomeComposer />);
    await say("honestly she's been saying she wants to die");
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("/chat?ask="));
    expect(mocks.classifyRouteRemote).not.toHaveBeenCalled();
    expect(mocks.speak).not.toHaveBeenCalled();
  });

  it("lets the live LLM upgrade a typed no-match to an instant navigate", async () => {
    mocks.classifyRouteRemote.mockResolvedValue({ kind: "navigate", href: "/plan", confidence: 0.9 });
    render(<HomeComposer />);
    type("just pick something helpful for me");
    await flushPromises();
    expect(mocks.push).toHaveBeenCalledWith("/plan");
    expect(mocks.speak).not.toHaveBeenCalled();
  });

  it("falls back to the Coach when the LLM defers", async () => {
    render(<HomeComposer />);
    type("just pick something helpful for me");
    await flushPromises();
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("/chat?ask="));
  });

  it("speaks and delays voice navigation until the cancel window ends", async () => {
    render(<HomeComposer />);
    await say("log my blood sugar");

    expect(mocks.speak).toHaveBeenCalledWith("Taking you to Log a blood sugar reading", { language: "en" });
    expect(screen.getByRole("button", { name: "Going to Log a blood sugar reading — tap to cancel" })).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(NAV_CONFIRM_MS));
    expect(mocks.push).toHaveBeenCalledWith("/glucose");
  });

  it("cancels voice navigation when the local grammar hears no", async () => {
    render(<HomeComposer />);
    await say("log my blood sugar");
    expect(mocks.start).toHaveBeenCalled();

    await say("no");
    await act(async () => vi.advanceTimersByTimeAsync(NAV_CONFIRM_MS));

    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/tell me what you need/i)).toHaveValue("log my blood sugar");
  });

  it("uses Spanish speech and cancel grammar", async () => {
    mocks.language = "es";
    render(<HomeComposer />);
    await say("registra mi glucosa");

    expect(mocks.speak).toHaveBeenCalledWith("Le llevo a Registrar tu azúcar en sangre", { language: "es" });
    await say("espera");
    await act(async () => vi.advanceTimersByTimeAsync(NAV_CONFIRM_MS));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("renders only allowlisted clarify chips and accepts a spoken ordinal", async () => {
    mocks.classifyRouteRemote.mockResolvedValue({
      kind: "clarify",
      candidates: ["/plan", "https://evil.example", "/visits"],
      confidence: 0.6
    });
    render(<HomeComposer />);
    await say("help me prepare");

    expect(screen.getByRole("button", { name: "My Plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Visits" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /evil/i })).not.toBeInTheDocument();
    expect(mocks.speak).toHaveBeenCalledWith("Did you mean My Plan or My Visits?", { language: "en" });

    await say("the second one");
    expect(mocks.push).toHaveBeenCalledWith("/visits");
  });

  it("falls back after clarify timeout and immediately when every candidate is unsafe", async () => {
    mocks.classifyRouteRemote.mockResolvedValueOnce({
      kind: "clarify",
      candidates: ["/plan", "/visits"],
      confidence: 0.6
    });
    const { unmount } = render(<HomeComposer />);
    await say("help me prepare");
    await act(async () => vi.advanceTimersByTimeAsync(6000));
    expect(mocks.push).toHaveBeenCalledWith("/chat?ask=help%20me%20prepare");
    unmount();

    mocks.push.mockClear();
    mocks.classifyRouteRemote.mockResolvedValueOnce({
      kind: "clarify",
      candidates: ["https://evil.example", "/admin"],
      confidence: 0.9
    });
    render(<HomeComposer />);
    await say("somewhere else");
    expect(mocks.push).toHaveBeenCalledWith("/chat?ask=somewhere%20else");
  });
});
