"use client";

import { Mic, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { decideFrontDoor } from "@/domain/front-door";
import { CLASSIFIER_HREFS } from "@/domain/route-classifier";
import { classifyRouteRemote } from "@/ai/route-classifier-client";
import { tHome } from "@/i18n/home-strings";
import { useHealthState } from "@/state/store";

// Minimal shim for the browser Web Speech API (the webkit-prefixed variant is
// untyped in lib.dom). Voice is only an input adapter: the transcript runs
// through the exact same deterministic, safety-first router as typed text, so
// the safety gate still fronts every spoken utterance.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function HomeComposer() {
  const router = useRouter();
  const { state } = useHealthState();
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  async function route(utterance: string) {
    const trimmed = utterance.trim();
    if (trimmed.length === 0) {
      return;
    }
    const decision = decideFrontDoor(trimmed, state);
    if (decision.kind === "navigate") {
      router.push(decision.href);
      return;
    }
    // A safety-triggered coach goes straight to the Coach — the crisis utterance
    // must never be sent to the LLM router.
    if (decision.reason === "safety") {
      router.push(`/chat?ask=${encodeURIComponent(trimmed)}`);
      return;
    }
    // No deterministic route matched; refine with the live LLM router if it is
    // configured. It fails closed to the Coach.
    const llm = await classifyRouteRemote(trimmed, CLASSIFIER_HREFS);
    if (llm.kind === "navigate" && typeof llm.href === "string" && CLASSIFIER_HREFS.includes(llm.href) && llm.confidence >= 0.75) {
      router.push(llm.href);
      return;
    }
    router.push(`/chat?ask=${encodeURIComponent(trimmed)}`);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void route(input);
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      return;
    }
    const recognition = new Recognition();
    recognition.lang = state.patient.language === "es" ? "es-US" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setInput(transcript);
      void route(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    // start() throws if the engine is already running or the mic is unavailable;
    // fail back to the idle state so the button stays usable.
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-control border border-ink/15 bg-white p-2">
      <label className="sr-only" htmlFor="home-composer-input">
        {tHome(state.patient.language, "composerLabel")}
      </label>
      <input
        id="home-composer-input"
        className="min-h-11 flex-1 rounded-control px-3 py-2 text-sm"
        placeholder={tHome(state.patient.language, "composerPlaceholder")}
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      {voiceSupported ? (
        <button
          type="button"
          onClick={toggleVoice}
          aria-label={listening ? tHome(state.patient.language, "composerStop") : tHome(state.patient.language, "composerSpeak")}
          aria-pressed={listening}
          className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full ${listening ? "bg-pulse text-white" : "bg-calm text-care"}`}
        >
          <Mic aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
      <button type="submit" aria-label={tHome(state.patient.language, "composerSend")} className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-care text-white">
        <Send aria-hidden="true" className="h-5 w-5" />
      </button>
    </form>
  );
}
