"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MockHealthAiProvider } from "@/ai/mock-provider";
import { buildFoodLensInstructions } from "@/ai/food-instructions";
import { connectRealtimeSession } from "@/ai/realtime-session";
import { selectLens } from "@/domain/condition-lens";
import type { AppState } from "@/domain/types";
import type { LiveSessionContext, LiveSessionEvent, LiveSessionHandle, LiveSessionStatus } from "@/ai/types";

export type VoiceMode = "unknown" | "live" | "mock";

const IDLE_TIMEOUT_MS = 180000;
const mockProvider = new MockHealthAiProvider();

type TokenResponse =
  | { mode: "live"; clientSecret: string; model: string; expiresAt: number | null }
  | { mode: "mock"; reason: string }
  | { mode: "error"; message: string };

export function useFoodVoiceSession(args: {
  language: "en" | "es";
  getState: () => AppState;
  getContext: () => LiveSessionContext;
  onFinalTranscript: (role: "patient" | "assistant", text: string) => void;
}): {
  mode: VoiceMode;
  status: LiveSessionStatus;
  partialAssistantText: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  sendUserText: (text: string) => void;
} {
  const { language, getState, getContext, onFinalTranscript } = args;
  const [mode, setMode] = useState<VoiceMode>("unknown");
  const [status, setStatus] = useState<LiveSessionStatus>("idle");
  const [partialAssistantText, setPartialAssistantText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<LiveSessionHandle | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;
  const partialRef = useRef("");

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearIdleTimer();
    handleRef.current?.close();
    handleRef.current = null;
    partialRef.current = "";
    setPartialAssistantText("");
  }, [clearIdleTimer]);

  const armIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      stop();
      setStatus("closed");
    }, IDLE_TIMEOUT_MS);
  }, [clearIdleTimer, stop]);

  const handleEvent = useCallback(
    (event: LiveSessionEvent) => {
      armIdleTimer();
      switch (event.type) {
        case "status":
          setStatus(event.status);
          break;
        case "userTranscript":
          if (event.final && event.text.trim().length > 0) {
            onFinalRef.current("patient", event.text);
          }
          break;
        case "assistantTranscript":
          if (event.final) {
            const text = event.text.trim().length > 0 ? event.text : partialRef.current;
            if (text.trim().length > 0) {
              onFinalRef.current("assistant", text);
            }
            partialRef.current = "";
            setPartialAssistantText("");
          } else {
            partialRef.current += event.text;
            setPartialAssistantText(partialRef.current);
          }
          break;
        case "error":
          setError(event.message);
          if (event.fatal) {
            setStatus("error");
          }
          break;
      }
    },
    [armIdleTimer]
  );

  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    let token: TokenResponse;
    try {
      const response = await fetch("/api/realtime/token", { method: "POST" });
      token = (await response.json()) as TokenResponse;
    } catch {
      token = { mode: "mock", reason: "fetch_failed" };
    }

    const state = getState();

    if (token.mode === "live") {
      setMode("live");
      try {
        handleRef.current = await connectRealtimeSession({
          clientSecret: token.clientSecret,
          model: token.model,
          instructions: buildFoodLensInstructions(state, selectLens(state.carePlan.condition)),
          language,
          getContext,
          onEvent: handleEvent
        });
        armIdleTimer();
      } catch {
        setError("Could not start the voice session.");
        setStatus("error");
      }
      return;
    }

    setMode("mock");
    handleRef.current = await mockProvider.openLiveSession({
      language,
      getState,
      getContext,
      onEvent: handleEvent
    });
    armIdleTimer();
  }, [armIdleTimer, getContext, getState, handleEvent, language]);

  const sendUserText = useCallback((text: string) => {
    handleRef.current?.sendUserText(text);
  }, []);

  useEffect(() => {
    return () => {
      clearIdleTimer();
      handleRef.current?.close();
      handleRef.current = null;
    };
  }, [clearIdleTimer]);

  return { mode, status, partialAssistantText, error, start, stop, sendUserText };
}
