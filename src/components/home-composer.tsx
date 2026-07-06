"use client";

import { Mic, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { decideFrontDoor } from "@/domain/front-door";
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

  function route(utterance: string) {
    const trimmed = utterance.trim();
    if (trimmed.length === 0) {
      return;
    }
    const decision = decideFrontDoor(trimmed, state);
    if (decision.kind === "navigate") {
      router.push(decision.href);
    } else {
      router.push(`/chat?ask=${encodeURIComponent(decision.ask)}`);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    route(input);
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
      route(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-control border border-ink/15 bg-white p-2">
      <label className="sr-only" htmlFor="home-composer-input">
        Tell me what you need
      </label>
      <input
        id="home-composer-input"
        className="min-h-11 flex-1 rounded-control px-3 py-2 text-sm"
        placeholder="Tell me what you need…"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      {voiceSupported ? (
        <button
          type="button"
          onClick={toggleVoice}
          aria-label={listening ? "Stop listening" : "Speak to the assistant"}
          aria-pressed={listening}
          className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full ${listening ? "bg-pulse text-white" : "bg-calm text-care"}`}
        >
          <Mic aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
      <button type="submit" aria-label="Send" className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-care text-white">
        <Send aria-hidden="true" className="h-5 w-5" />
      </button>
    </form>
  );
}
