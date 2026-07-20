"use client";

import { useEffect, useRef } from "react";
import type { AiMessage } from "@/domain/types";
import type { Language } from "@/i18n/strings";
import { speak } from "./tts";

export function AssistantMessageAutoReader({
  messages,
  language,
  enabled,
  liveVoiceActive
}: {
  messages: AiMessage[];
  language: Language;
  enabled: boolean;
  liveVoiceActive: boolean;
}) {
  const lastSeenIdRef = useRef(messages.at(-1)?.id ?? null);

  useEffect(() => {
    const latest = messages.at(-1);
    if (!latest || latest.id === lastSeenIdRef.current) return;
    lastSeenIdRef.current = latest.id;
    if (!enabled || liveVoiceActive || latest.role !== "assistant") return;
    void speak(latest.content, {
      language,
      rate: latest.safety === "crisis" ? 0.9 : 1
    });
  }, [enabled, language, liveVoiceActive, messages]);

  return null;
}
