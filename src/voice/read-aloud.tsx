"use client";

import { Square, Volume2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { Language } from "@/i18n/strings";
import { tVoice } from "@/i18n/voice-strings";
import { speak, stopSpeaking } from "./tts";

export function ReadAloud({ text, language }: { text: string; language: Language }) {
  const [reading, setReading] = useState(false);
  const readingRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(
    () => () => {
      generationRef.current += 1;
      if (readingRef.current) stopSpeaking();
    },
    []
  );

  async function toggle(): Promise<void> {
    if (readingRef.current) {
      generationRef.current += 1;
      readingRef.current = false;
      setReading(false);
      stopSpeaking();
      return;
    }
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    readingRef.current = true;
    setReading(true);
    await speak(text, { language });
    if (generationRef.current === generation) {
      readingRef.current = false;
      setReading(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={tVoice(language, reading ? "stopReading" : "readAloud")}
      aria-pressed={reading}
      onClick={() => void toggle()}
      className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control border border-care bg-white p-2 text-care focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
    >
      {reading ? <Square aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-5 w-5" />}
    </button>
  );
}
