"use client";

import { Mic, Square } from "lucide-react";
import React, { useEffect, useRef } from "react";
import type { Language } from "@/i18n/strings";
import { tVoice } from "@/i18n/voice-strings";

type AudioContextConstructor = new () => AudioContext;

function currentLanguage(): Language {
  return typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("es")
    ? "es"
    : "en";
}

function playEarcon(starting: boolean): void {
  if (typeof window === "undefined") return;
  const audioWindow = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Context) return;
  try {
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = starting ? 660 : 440;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
  } catch {
    // Earcons are optional when audio APIs are unavailable or locked.
  }
}

export function VoiceIndicator({
  listening,
  speaking,
  onStop
}: {
  listening: boolean;
  speaking: boolean;
  onStop: () => void;
}) {
  const active = listening || speaking;
  const previousActive = useRef(false);

  useEffect(() => {
    if (active !== previousActive.current) {
      playEarcon(active);
      previousActive.current = active;
    }
  }, [active]);

  if (!active) return null;
  const language = currentLanguage();

  return (
    <div role="status" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-calm px-3 py-2 text-sm font-semibold text-care">
      <Mic aria-hidden="true" className="h-4 w-4 animate-pulse" />
      <span>{listening ? tVoice(language, "listening") : tVoice(language, "speaking")}</span>
      <button
        type="button"
        aria-label={tVoice(language, "stopVoice")}
        onClick={onStop}
        className="rounded-full p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
      >
        <Square aria-hidden="true" className="h-3 w-3" />
      </button>
    </div>
  );
}
