import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDictation } from "./use-dictation";

type RecognitionResult = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];

  lang = "";
  interimResults = true;
  maxAlternatives = 0;
  onresult: ((event: { results: RecognitionResult; resultIndex?: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

function result(transcript: string, isFinal: boolean) {
  return Object.assign([{ transcript }], { isFinal });
}

function installRecognition(): void {
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: MockSpeechRecognition
  });
}

describe("useDictation", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "SpeechRecognition");
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
    MockSpeechRecognition.instances = [];
  });

  it("accepts final results once, ignores interim and replayed results, and uses the requested locale", () => {
    installRecognition();
    const onFinalTranscript = vi.fn();
    const { result: hook } = renderHook(() => useDictation({ language: "es", onFinalTranscript }));

    act(() => hook.current.start());

    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition.lang).toBe("es-US");
    expect(recognition.interimResults).toBe(false);
    expect(recognition.maxAlternatives).toBe(1);
    expect(hook.current.listening).toBe(true);

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [result("borrador", false), result("presión alta", true)]
      });
      recognition.onresult?.({
        resultIndex: 1,
        results: [result("borrador", false), result("presión alta", true)]
      });
    });

    expect(onFinalTranscript).toHaveBeenCalledTimes(1);
    expect(onFinalTranscript).toHaveBeenCalledWith("presión alta");
  });

  it("stops and detaches recognition on unmount", () => {
    installRecognition();
    const { result: hook, unmount } = renderHook(() =>
      useDictation({ language: "en", onFinalTranscript: () => undefined })
    );

    act(() => hook.current.start());
    const recognition = MockSpeechRecognition.instances[0];
    unmount();

    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onend).toBeNull();
  });

  it("reports unsupported without creating a recognition session", () => {
    const { result: hook } = renderHook(() =>
      useDictation({ language: "en", onFinalTranscript: () => undefined })
    );

    expect(hook.current.supported).toBe(false);
    act(() => hook.current.start());
    expect(hook.current.listening).toBe(false);
  });
});
