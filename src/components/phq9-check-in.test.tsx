import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { matchPhq9VoiceResponse, Phq9CheckIn } from "./phq9-check-in";

const voice = vi.hoisted(() => ({
  active: null as ((text: string) => void) | null,
  callbacks: [] as Array<(text: string) => void>,
  speak: vi.fn(() => Promise.resolve()),
  start: vi.fn(),
  stop: vi.fn(),
  stopSpeaking: vi.fn()
}));

vi.mock("@/voice/use-dictation", () => ({
  useDictation: ({ onFinalTranscript }: { onFinalTranscript: (text: string) => void }) => {
    voice.callbacks.push(onFinalTranscript);
    return {
      supported: true,
      listening: false,
      start: () => {
        voice.active = onFinalTranscript;
        voice.start();
      },
      stop: voice.stop
    };
  }
}));
vi.mock("@/voice/voice-consent", () => ({
  useVoiceEntry: () => ({ consentRequired: false, grantConsent: vi.fn(), onSessionStart: vi.fn() })
}));
vi.mock("@/voice/tts", () => ({
  isSpeaking: () => false,
  speak: voice.speak,
  stopSpeaking: voice.stopSpeaking,
  subscribeSpeaking: () => () => undefined
}));

beforeEach(() => {
  voice.active = null;
  voice.callbacks.length = 0;
  voice.speak.mockClear();
  voice.start.mockClear();
  voice.stop.mockClear();
  voice.stopSpeaking.mockClear();
});

describe("matchPhq9VoiceResponse", () => {
  it.each([
    ["not at all", "en", 0],
    ["one", "en", 1],
    ["2", "en", 2],
    ["the fourth one", "en", 3],
    ["para nada", "es", 0],
    ["dos", "es", 2],
    ["la tercera", "es", 2],
    ["casi todos los días", "es", 3]
  ] as const)("matches %s", (text, language, expected) => {
    expect(matchPhq9VoiceResponse(text, language)).toBe(expected);
  });

  it("returns null instead of guessing", () => {
    expect(matchPhq9VoiceResponse("sometimes, I suppose", "en")).toBeNull();
  });
});

describe("Phq9CheckIn", () => {
  it("gates the questionnaire behind the consent screen on first run", async () => {
    const user = userEvent.setup();
    render(<Phq9CheckIn language="en" onComplete={vi.fn()} />);

    // The first PHQ-9 item must not be visible until consent is acknowledged.
    expect(screen.queryByText(/Little interest or pleasure/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start the check-in/i }));

    expect(screen.getByText(/Little interest or pleasure/i)).toBeInTheDocument();
  });

  it("explains that spoken answers stay on this device", () => {
    render(<Phq9CheckIn language="en" onComplete={vi.fn()} />);
    expect(screen.getByText(/spoken answers are interpreted on this device/i)).toBeInTheDocument();
  });

  it("blocks submission until every item is answered, then reports responses", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Phq9CheckIn language="en" onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: /start the check-in/i }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).not.toHaveBeenCalled();

    const groups = screen.getAllByRole("group");
    for (const group of groups) {
      const options = group.querySelectorAll('input[type="radio"]');
      await user.click(options[0]);
    }

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).toHaveBeenCalledWith([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("sets a radio from local voice matching without a network call", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<Phq9CheckIn language="en" onComplete={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /start the check-in/i }));

    await user.click(screen.getByRole("button", { name: "Answer item 1 by voice" }));
    await act(async () => voice.active?.("several days"));
    const firstGroup = screen.getAllByRole("group")[0];
    expect(firstGroup.querySelector('input[value="1"]')).toBeChecked();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("matches spoken item 9 identically and keeps Submit tap-only", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<Phq9CheckIn language="en" onComplete={onComplete} />);
    await user.click(screen.getByRole("button", { name: /start the check-in/i }));

    await user.click(screen.getByRole("button", { name: "Answer item 9 by voice" }));
    await act(async () => voice.active?.("nearly every day"));
    expect(onComplete).not.toHaveBeenCalled();
    const groups = screen.getAllByRole("group");
    groups.slice(0, 8).forEach((group) => (group.querySelector('input[value="0"]') as HTMLInputElement).click());
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).toHaveBeenCalledWith([0, 0, 0, 0, 0, 0, 0, 0, 3]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
