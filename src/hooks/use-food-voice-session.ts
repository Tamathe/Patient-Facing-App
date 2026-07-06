"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OpenAiVisionProvider } from "@/ai/vision-provider";
import { openLocalCoachSession } from "@/ai/local-coach-session";
import { buildFoodLensInstructions } from "@/ai/food-instructions";
import { connectRealtimeSession } from "@/ai/realtime-session";
import { evaluateVoiceTranscript } from "@/ai/voice-gate";
import { selectLens } from "@/domain/condition-lens";
import { hasUnacknowledgedCrisis } from "@/state/selectors";
import type { AiMessageAction, AppState } from "@/domain/types";
import type { LiveSessionContext, LiveSessionEvent, LiveSessionHandle, LiveSessionStatus } from "@/ai/types";

export type VoiceSafetyIntercept = {
  safety: "crisis" | "escalate" | "blocked";
  content: string;
  banner?: string;
  actions: AiMessageAction[];
};

export type VoiceMode = "unknown" | "live" | "mock";

const IDLE_TIMEOUT_MS = 180000;

type TokenResponse =
  | { mode: "live"; clientSecret: string; model: string; expiresAt: number | null }
  | { mode: "mock"; reason: string }
  | { mode: "error"; message: string };

export function useFoodVoiceSession(args: {
  language: "en" | "es";
  getState: () => AppState;
  getContext: () => LiveSessionContext;
  onFinalTranscript: (role: "patient" | "assistant", text: string) => void;
  onSafetyIntercept: (intercept: VoiceSafetyIntercept) => void;
}): {
  mode: VoiceMode;
  status: LiveSessionStatus;
  partialAssistantText: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  sendUserText: (text: string) => void;
} {
  const { language, getState, getContext, onFinalTranscript, onSafetyIntercept } = args;
  const onInterceptRef = useRef(onSafetyIntercept);
  onInterceptRef.current = onSafetyIntercept;
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
        case "safetyIntercept":
          partialRef.current = "";
          setPartialAssistantText("");
          onInterceptRef.current({
            safety: event.safety,
            content: event.content,
            banner: event.banner,
            actions: event.actions
          });
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

  const gateTranscript = useCallback(
    (text: string) => evaluateVoiceTranscript(text, getState(), language),
    [getState, language]
  );

  const start = useCallback(async () => {
    setError(null);

    const stateBeforeStart = getState();
    // Refuse to open a routine voice session while an unacknowledged crisis is on
    // screen — the crisis resources must stay the focus.
    if (hasUnacknowledgedCrisis(stateBeforeStart)) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const passcode =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("k") ?? undefined
        : undefined;
    let token: TokenResponse;
    try {
      const response = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: stateBeforeStart.patient.id, crisisOpen: false, passcode })
      });
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
          onEvent: handleEvent,
          gateTranscript
        });
        armIdleTimer();
      } catch {
        setError("Could not start the voice session.");
        setStatus("error");
      }
      return;
    }

    // Non-realtime fallback: typed questions still get a real image answer from the
    // HTTP vision provider (which degrades to the on-device coach when the model is
    // not configured or the demo is locked), read aloud via speech synthesis.
    setMode("mock");
    handleRef.current = await openLocalCoachSession(
      { language, getState, getContext, onEvent: handleEvent },
      new OpenAiVisionProvider({ passcode })
    );
    armIdleTimer();
  }, [armIdleTimer, gateTranscript, getContext, getState, handleEvent, language]);

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
