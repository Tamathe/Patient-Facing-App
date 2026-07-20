import { render } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiMessage } from "@/domain/types";
import { AssistantMessageAutoReader } from "./assistant-message-auto-reader";

const speak = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock("./tts", () => ({ speak, stopSpeaking: vi.fn() }));

const message = (id: string, role: AiMessage["role"], safety: AiMessage["safety"] = "allowed"): AiMessage => ({
  id,
  mode: "ask",
  role,
  content: `Message ${id}`,
  createdAt: `2026-07-20T12:00:0${id}.000Z`,
  safety,
  sources: []
});

describe("AssistantMessageAutoReader", () => {
  beforeEach(() => speak.mockClear());

  it("does not replay existing messages on mount and reads a later assistant message when enabled", () => {
    const existing = [message("1", "assistant")];
    const { rerender } = render(
      <AssistantMessageAutoReader messages={existing} language="en" enabled liveVoiceActive={false} />
    );
    expect(speak).not.toHaveBeenCalled();

    rerender(
      <AssistantMessageAutoReader
        messages={[...existing, message("2", "assistant")]}
        language="en"
        enabled
        liveVoiceActive={false}
      />
    );
    expect(speak).toHaveBeenCalledWith("Message 2", { language: "en", rate: 1 });
  });

  it("does not read without the preference or while live voice is active", () => {
    const { rerender } = render(
      <AssistantMessageAutoReader messages={[]} language="en" enabled={false} liveVoiceActive={false} />
    );
    rerender(
      <AssistantMessageAutoReader messages={[message("1", "assistant")]} language="en" enabled={false} liveVoiceActive={false} />
    );
    expect(speak).not.toHaveBeenCalled();

    rerender(
      <AssistantMessageAutoReader messages={[message("1", "assistant"), message("2", "assistant")]} language="en" enabled liveVoiceActive />
    );
    expect(speak).not.toHaveBeenCalled();
  });

  it("uses a slower rate for a new crisis message", () => {
    const { rerender } = render(
      <AssistantMessageAutoReader messages={[]} language="es" enabled liveVoiceActive={false} />
    );
    rerender(
      <AssistantMessageAutoReader messages={[message("1", "assistant", "crisis")]} language="es" enabled liveVoiceActive={false} />
    );
    expect(speak).toHaveBeenCalledWith("Message 1", { language: "es", rate: 0.9 });
  });
});
