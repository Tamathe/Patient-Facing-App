import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceCaptureCard } from "./voice-capture-card";

const voice = vi.hoisted(() => ({
  finalTranscript: null as ((text: string) => void) | null,
  speak: vi.fn(() => Promise.resolve()),
  start: vi.fn(),
  stop: vi.fn(),
  stopSpeaking: vi.fn()
}));

vi.mock("./use-dictation", () => ({
  useDictation: ({ onFinalTranscript }: { onFinalTranscript: (text: string) => void }) => {
    voice.finalTranscript = onFinalTranscript;
    return { supported: true, listening: false, start: voice.start, stop: voice.stop };
  }
}));
vi.mock("./voice-consent", () => ({
  useVoiceEntry: () => ({ consentRequired: false, grantConsent: vi.fn(), onSessionStart: vi.fn() })
}));
vi.mock("./tts", () => ({
  isSpeaking: () => false,
  speak: voice.speak,
  stopSpeaking: voice.stopSpeaking,
  subscribeSpeaking: () => () => undefined
}));

async function say(text: string): Promise<void> {
  await act(async () => voice.finalTranscript?.(text));
}

beforeEach(() => {
  voice.finalTranscript = null;
  voice.speak.mockClear();
  voice.start.mockClear();
  voice.stop.mockClear();
  voice.stopSpeaking.mockClear();
});

describe("VoiceCaptureCard", () => {
  it("stages BP with spoken context and commits only after Save is tapped", async () => {
    const onSave = vi.fn();
    render(<VoiceCaptureCard kind="bp" language="en" onSave={onSave} />);

    await say("120 over 80 after resting");
    expect(screen.getByLabelText("Top number")).toHaveValue(120);
    expect(screen.getByLabelText("Bottom number")).toHaveValue(80);
    expect(screen.getByRole("checkbox", { name: "After resting" })).toBeChecked();
    expect(screen.getByText("120 / 80")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save voice reading" }));
    expect(onSave).toHaveBeenCalledWith({
      systolic: 120,
      diastolic: 80,
      pulse: null,
      contexts: ["after_resting"],
      note: ""
    });
    expect(voice.speak).toHaveBeenCalledWith("Saved: 120 over 80.", { language: "en" });
  });

  it("keeps Save disabled until a context is selected", async () => {
    render(<VoiceCaptureCard kind="bp" language="en" onSave={vi.fn()} />);
    await say("120 over 80");
    expect(screen.getByRole("button", { name: "Save voice reading" })).toBeDisabled();
  });

  it("reads invalid BP digits back and never commits it", async () => {
    const onSave = vi.fn();
    render(<VoiceCaptureCard kind="bp" language="en" onSave={onSave} />);
    await say("180 over 210 after coffee");

    expect(voice.speak).toHaveBeenCalledWith(
      "I heard one-eight-zero over two-one-zero — that doesn't look right. Tap a number to fix it.",
      { language: "en" }
    );
    expect(screen.getByRole("alert")).toHaveTextContent("doesn't look right");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("stages and saves glucose with a preselected context", async () => {
    const onSave = vi.fn();
    render(<VoiceCaptureCard kind="glucose" language="en" onSave={onSave} />);
    await say("one forty five after resting");

    expect(screen.getByLabelText("Blood sugar (mg/dL)")).toHaveValue(145);
    expect(screen.getByRole("checkbox", { name: "After resting" })).toBeChecked();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save voice reading" }));
    expect(onSave).toHaveBeenCalledWith({ valueMgDl: 145, contexts: ["after_resting"], note: "" });
  });

  it("supports the typed twin and reprompts only once on parse failure", async () => {
    render(<VoiceCaptureCard kind="glucose" language="en" onSave={vi.fn()} />);
    const twin = screen.getByLabelText("Type what you would say");
    fireEvent.change(twin, { target: { value: "not a number" } });
    fireEvent.click(screen.getByRole("button", { name: "Review typed words" }));
    fireEvent.click(screen.getByRole("button", { name: "Review typed words" }));
    expect(voice.speak).toHaveBeenCalledTimes(1);
    expect(voice.speak).toHaveBeenCalledWith(
      "You can say a number, like ‘one forty five’.",
      { language: "en" }
    );
  });
});
