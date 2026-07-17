"use client";

import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { requestFamilyInterview } from "@/ai/family-interview-provider";
import { extractFamilyInterviewMock, familyInterviewInputSchema, type FamilyInterviewResult } from "@/domain/family-interview";
import { stripUnsafeFamilyRationales } from "@/domain/family-diagnosis-lint";
import { classifyCrisis, classifySafety } from "@/domain/safety";
import { screenSocialEmergency } from "@/domain/social-screen";
import type { FamilyProfile } from "@/domain/types";
import type { Language } from "@/i18n/strings";

export const FAMILY_INTERVIEW_MAX_CHARS = 5000;
// Leave 50 characters of deterministic headroom so a final speech result can be
// accepted whole; speech is disabled at this point and is never silently cut off.
export const FAMILY_INTERVIEW_MIC_DISABLE_AT = 4950;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
    resultIndex?: number;
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type SanitizedFamilyInterviewResult = Omit<FamilyInterviewResult, "domains"> & {
  domains: Array<{ domain: FamilyInterviewResult["domains"][number]["domain"]; rationale?: string }>;
};

export type FamilyInterviewProps = {
  profile: FamilyProfile;
  draft: string;
  passcode?: string;
  language: Language;
  onDraftChange: (draft: string) => void;
  onExtracted: (
    result: SanitizedFamilyInterviewResult,
    extraction: "live" | "mock",
    source: "typed" | "voice" | "mixed"
  ) => void;
};

const COPY = {
  en: {
    label: "Family interview",
    placeholder: "Tell us what support your family is looking for.",
    submit: "Crunch interview",
    speak: "Speak family interview",
    stop: "Stop listening",
    tooLong: "The interview is too long. The maximum is 5000 characters.",
    tooShort: "Please enter at least 10 characters.",
    working: "Reviewing your interview…"
  },
  es: {
    label: "Entrevista familiar",
    placeholder: "Cuéntenos qué apoyo busca su familia.",
    submit: "Revisar entrevista",
    speak: "Hablar la entrevista familiar",
    stop: "Dejar de escuchar",
    tooLong: "La entrevista es demasiado larga. El máximo es de 5000 caracteres.",
    tooShort: "Escriba al menos 10 caracteres.",
    working: "Revisando su entrevista…"
  }
} as const;

function speechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function sanitizeResult(result: FamilyInterviewResult, profile: FamilyProfile): SanitizedFamilyInterviewResult {
  return {
    ...result,
    domains: stripUnsafeFamilyRationales(result.domains, profile.childFirstName)
  };
}

export function FamilyInterview({
  profile,
  draft,
  passcode,
  language,
  onDraftChange,
  onExtracted
}: FamilyInterviewProps) {
  const router = useRouter();
  const copy = COPY[language];
  const [text, setText] = useState(draft);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(draft.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const inputSourceRef = useRef<"typed" | "voice" | "mixed">("typed");
  const lastLocalDraftRef = useRef(draft);

  useEffect(() => {
    setVoiceSupported(speechRecognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    setText(draft);
    setError(draft.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : null);
    if (draft !== lastLocalDraftRef.current) {
      inputSourceRef.current = "typed";
      lastLocalDraftRef.current = draft;
    }
  }, [copy.tooLong, draft]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    },
    []
  );

  function updateText(next: string): void {
    inputSourceRef.current = inputSourceRef.current === "voice" || inputSourceRef.current === "mixed" ? "mixed" : "typed";
    lastLocalDraftRef.current = next;
    setText(next);
    onDraftChange(next);
    setError(next.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : null);
  }

  function appendTranscript(transcript: string): void {
    const spoken = transcript.trim();
    if (!spoken) return;
    setText((current) => {
      const next = current.length > 0 ? `${current} ${spoken}` : spoken;
      if (next.length > FAMILY_INTERVIEW_MAX_CHARS) {
        setError(copy.tooLong);
        return current;
      }
      inputSourceRef.current = current.length === 0 && inputSourceRef.current === "typed" ? "voice" : inputSourceRef.current === "voice" ? "voice" : "mixed";
      lastLocalDraftRef.current = next;
      setError(null);
      onDraftChange(next);
      return next;
    });
  }

  function toggleVoice(): void {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = speechRecognitionConstructor();
    if (!Recognition || text.length >= FAMILY_INTERVIEW_MIC_DISABLE_AT) return;
    const recognition = new Recognition();
    recognition.lang = language === "es" ? "es-US" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const start = event.resultIndex ?? 0;
      for (let index = start; index < event.results.length; index += 1) {
        const result = event.results[index];
        const first = result?.[0];
        if (first && result.isFinal !== false) appendTranscript(first.transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!familyInterviewInputSchema.safeParse(text).success) {
      setError(text.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : copy.tooShort);
      return;
    }
    if (classifyCrisis(text).matched || classifySafety(text).level !== "allowed" || screenSocialEmergency(text)) {
      router.push(`/chat?ask=${encodeURIComponent(text)}`);
      return;
    }

    setSubmitting(true);
    let live: FamilyInterviewResult | null = null;
    try {
      live = await requestFamilyInterview({ text, profile, passcode, language });
    } catch {
      live = null;
    }
    const extraction = live ? "live" : "mock";
    const result = live ?? extractFamilyInterviewMock(text, profile);
    onExtracted(sanitizeResult(result, profile), extraction, inputSourceRef.current);
    setSubmitting(false);
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void submit(event)}>
      <label className="block text-sm font-semibold" htmlFor="family-interview-text">
        {copy.label}
      </label>
      <textarea
        id="family-interview-text"
        aria-describedby="family-interview-count family-interview-status"
        className="min-h-36 w-full rounded-control border border-ink/20 bg-white p-3"
        value={text}
        placeholder={copy.placeholder}
        onChange={(event) => updateText(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <p id="family-interview-count" className="text-sm text-ink/65" aria-live="polite">
          {text.length} / {FAMILY_INTERVIEW_MAX_CHARS}
        </p>
        <div className="flex items-center gap-2">
          {voiceSupported ? (
            <button
              type="button"
              aria-label={listening ? copy.stop : copy.speak}
              aria-pressed={listening}
              disabled={text.length >= FAMILY_INTERVIEW_MIC_DISABLE_AT}
              onClick={toggleVoice}
              className="rounded-control bg-calm p-3 text-care disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic aria-hidden="true" className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={submitting || !familyInterviewInputSchema.safeParse(text).success}
            className="rounded-control bg-care px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.submit}
          </button>
        </div>
      </div>
      <div id="family-interview-status" aria-live="polite">
        {error ? <p role="alert" className="text-sm font-medium text-rose-700">{error}</p> : null}
        {submitting ? <p role="status" className="text-sm text-ink/70">{copy.working}</p> : null}
      </div>
    </form>
  );
}
