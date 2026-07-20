import { afterEach, describe, expect, it, vi } from "vitest";
import { isSpeaking, speak, stopSpeaking, subscribeSpeaking } from "./tts";

class MockUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function installSpeech(voices: SpeechSynthesisVoice[] = []) {
  const spoken: MockUtterance[] = [];
  const synthesis = {
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
    addEventListener: vi.fn(),
    speak: vi.fn((utterance: MockUtterance) => spoken.push(utterance))
  };
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockUtterance });
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { configurable: true, value: MockUtterance });
  return { spoken, synthesis };
}

describe("tts", () => {
  afterEach(() => {
    stopSpeaking();
    Reflect.deleteProperty(window, "speechSynthesis");
    Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
    Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
  });

  it("speaks with defaults, publishes state, and resolves when the utterance ends", async () => {
    const { spoken } = installSpeech();
    const states: boolean[] = [];
    const unsubscribe = subscribeSpeaking((speaking) => states.push(speaking));

    const pending = speak("Hello", { language: "en" });
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatchObject({ text: "Hello", lang: "en-US", rate: 1 });
    expect(isSpeaking()).toBe(true);

    spoken[0].onend?.();
    await expect(pending).resolves.toBeUndefined();
    expect(isSpeaking()).toBe(false);
    expect(states).toEqual([true, false]);
    unsubscribe();
  });

  it("cancels active speech and resolves its promise", async () => {
    const { synthesis } = installSpeech();
    const pending = speak("Stop me", { language: "en" });

    stopSpeaking();

    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toBeUndefined();
    expect(isSpeaking()).toBe(false);
  });

  it("resolves without work when speech synthesis is unavailable", async () => {
    await expect(speak("Silent", { language: "en" })).resolves.toBeUndefined();
    expect(isSpeaking()).toBe(false);
  });

  it("prefers an es-US voice and falls back to the es-ES locale while voices warm up", () => {
    const preferred = { lang: "es-US", name: "US Spanish" } as SpeechSynthesisVoice;
    const other = { lang: "es-ES", name: "Spain Spanish" } as SpeechSynthesisVoice;
    const populated = installSpeech([other, preferred]);
    void speak("Hola", { language: "es", rate: 0.9 });

    expect(populated.spoken[0].voice).toBe(preferred);
    expect(populated.spoken[0]).toMatchObject({ lang: "es-US", rate: 0.9 });
    stopSpeaking();

    Reflect.deleteProperty(window, "speechSynthesis");
    const empty = installSpeech([]);
    void speak("Hola de nuevo", { language: "es" });
    expect(empty.spoken[0]).toMatchObject({ lang: "es-ES" });
    expect(empty.synthesis.addEventListener).toHaveBeenCalledWith("voiceschanged", expect.any(Function), {
      once: true
    });
  });
});
