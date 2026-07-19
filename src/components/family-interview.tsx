"use client";

import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { requestFamilyInterview } from "@/ai/family-interview-provider";
import { extractFamilyInterviewMock, familyInterviewInputSchema, type FamilyInterviewResult } from "@/domain/family-interview";
import { filterUnsupportedDiagnosisFacts, stripUnsafeFamilyRationales } from "@/domain/family-diagnosis-lint";
import { sanitizeFamilyFollowUps } from "@/domain/family-follow-up-lint";
import { classifyCrisis, classifySafety } from "@/domain/safety";
import { screenSocialEmergency } from "@/domain/social-screen";
import type { FamilyProfile } from "@/domain/types";
import { tFamily } from "@/i18n/family-strings";
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

export type FamilyInterviewSubmissionMeta = {
  extraction: "live" | "mock";
  source: "typed" | "voice" | "mixed";
  rawText: string;
};

export type FamilyInterviewProps = {
  profile: FamilyProfile;
  draft: string;
  passcode?: string;
  language: Language;
  onDraftChange: (draft: string) => void;
  onExtracted: (result: SanitizedFamilyInterviewResult, meta: FamilyInterviewSubmissionMeta) => void;
  onSafetyEscalation?: () => void;
};

function speechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function sanitizeResult(
  result: FamilyInterviewResult,
  profile: FamilyProfile,
  rawText: string
): SanitizedFamilyInterviewResult {
  return {
    ...result,
    facts: filterUnsupportedDiagnosisFacts(result.facts, rawText, profile),
    domains: stripUnsafeFamilyRationales(result.domains, profile.childFirstName),
    followUps: sanitizeFamilyFollowUps(result.followUps, profile.childFirstName)
  };
}

function familyContextKey(profile: FamilyProfile, draft: string, language: Language): string {
  return JSON.stringify({ profile, draft, language });
}

export function FamilyInterview({
  profile,
  draft,
  passcode,
  language,
  onDraftChange,
  onExtracted,
  onSafetyEscalation
}: FamilyInterviewProps) {
  const router = useRouter();
  const copy = {
    label: tFamily(language, "interviewLabel"),
    placeholder: tFamily(language, "interviewPlaceholder"),
    submit: tFamily(language, "interviewSubmit"),
    speak: tFamily(language, "interviewMicStart"),
    stop: tFamily(language, "interviewMicStop"),
    tooLong: tFamily(language, "interviewErrorTooLong"),
    tooShort: tFamily(language, "interviewErrorTooShort"),
    working: tFamily(language, "interviewWorking")
  };
  const [text, setText] = useState(draft);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(draft.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionGenerationRef = useRef(0);
  const acceptedSpeechResultsRef = useRef(new Set<string>());
  const inputSourceRef = useRef<"typed" | "voice" | "mixed">("typed");
  const lastLocalDraftRef = useRef(draft);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const latestContextKeyRef = useRef(familyContextKey(profile, draft, language));
  latestContextKeyRef.current = familyContextKey(profile, draft, language);

  const cleanupRecognition = useCallback(
    (target = recognitionRef.current, stop = true, updateState = true): void => {
      if (!target) {
        if (updateState && mountedRef.current) setListening(false);
        return;
      }
      target.onresult = null;
      target.onerror = null;
      target.onend = null;
      if (recognitionRef.current === target) {
        recognitionRef.current = null;
        recognitionGenerationRef.current += 1;
        if (updateState && mountedRef.current) setListening(false);
      }
      if (stop) {
        try {
          target.stop();
        } catch {
          // The engine may already be stopped; handlers are detached either way.
        }
      }
    },
    []
  );

  useEffect(() => {
    setVoiceSupported(speechRecognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    if (submitting) return;
    setText(draft);
    setError(draft.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : null);
    if (draft !== lastLocalDraftRef.current) {
      inputSourceRef.current = "typed";
      lastLocalDraftRef.current = draft;
    }
  }, [copy.tooLong, draft, submitting]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupRecognition(recognitionRef.current, true, false);
    };
  }, [cleanupRecognition]);

  function updateText(next: string): void {
    if (submittingRef.current) return;
    inputSourceRef.current = inputSourceRef.current === "voice" || inputSourceRef.current === "mixed" ? "mixed" : "typed";
    lastLocalDraftRef.current = next;
    setText(next);
    onDraftChange(next);
    setError(next.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : null);
  }

  function appendTranscript(transcript: string): void {
    if (submittingRef.current) return;
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
    if (submittingRef.current) return;
    if (listening) {
      cleanupRecognition();
      return;
    }
    const Recognition = speechRecognitionConstructor();
    if (!Recognition || text.length >= FAMILY_INTERVIEW_MIC_DISABLE_AT) return;
    const recognition = new Recognition();
    acceptedSpeechResultsRef.current.clear();
    recognition.lang = language === "es" ? "es-US" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    const generation = recognitionGenerationRef.current + 1;
    recognitionGenerationRef.current = generation;
    recognition.onresult = (event) => {
      if (
        submittingRef.current ||
        recognitionRef.current !== recognition ||
        recognitionGenerationRef.current !== generation
      ) {
        return;
      }
      const start = event.resultIndex ?? 0;
      for (let index = start; index < event.results.length; index += 1) {
        const result = event.results[index];
        const first = result?.[0];
        if (first && result.isFinal === true) {
          const resultKey = `${index}:${first.transcript.trim()}`;
          if (acceptedSpeechResultsRef.current.has(resultKey)) continue;
          acceptedSpeechResultsRef.current.add(resultKey);
          appendTranscript(first.transcript);
        }
      }
    };
    recognition.onerror = () => cleanupRecognition(recognition, false);
    recognition.onend = () => cleanupRecognition(recognition, false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      cleanupRecognition(recognition, false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    const snapshot = {
      rawText: text,
      profile: {
        ...profile,
        diagnoses: profile.diagnoses.map((diagnosis) => ({ ...diagnosis }))
      },
      source: inputSourceRef.current,
      passcode,
      language,
      contextKey: latestContextKeyRef.current
    } as const;
    cleanupRecognition();
    let pending = false;
    try {
      if (!familyInterviewInputSchema.safeParse(snapshot.rawText).success) {
        setError(snapshot.rawText.length > FAMILY_INTERVIEW_MAX_CHARS ? copy.tooLong : copy.tooShort);
        return;
      }
      if (
        classifyCrisis(snapshot.rawText).matched ||
        classifySafety(snapshot.rawText).level !== "allowed" ||
        screenSocialEmergency(snapshot.rawText)
      ) {
        onSafetyEscalation?.();
        router.push(`/chat?ask=${encodeURIComponent(snapshot.rawText)}`);
        return;
      }

      pending = true;
      setSubmitting(true);
      let live: FamilyInterviewResult | null = null;
      try {
        live = await requestFamilyInterview({
          text: snapshot.rawText,
          profile: snapshot.profile,
          passcode: snapshot.passcode,
          language: snapshot.language
        });
      } catch {
        live = null;
      }
      if (!mountedRef.current || latestContextKeyRef.current !== snapshot.contextKey) return;
      const extraction = live ? "live" : "mock";
      const result =
        live ?? extractFamilyInterviewMock(snapshot.rawText, snapshot.profile, new Date(), snapshot.language);
      if (mountedRef.current) {
        onExtracted(sanitizeResult(result, snapshot.profile, snapshot.rawText), {
          extraction,
          source: snapshot.source,
          rawText: snapshot.rawText
        });
      }
    } finally {
      submittingRef.current = false;
      if (pending && mountedRef.current) setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void submit(event)}>
      <label className="block text-sm font-semibold" htmlFor="family-interview-text">
        {copy.label}
      </label>
      <textarea
        id="family-interview-text"
        aria-describedby="family-interview-count family-interview-status"
        aria-invalid={error !== null}
        className="min-h-36 w-full rounded-control border border-ink/20 bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
        disabled={submitting}
        value={text}
        placeholder={copy.placeholder}
        onChange={(event) => updateText(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <p id="family-interview-count" className="text-sm text-ink/65" aria-live="polite">
          {tFamily(language, "interviewCount", { count: text.length, max: FAMILY_INTERVIEW_MAX_CHARS })}
        </p>
        <div className="flex items-center gap-2">
          {voiceSupported ? (
            <button
              type="button"
              aria-label={listening ? copy.stop : copy.speak}
              aria-pressed={listening}
              disabled={submitting || text.length >= FAMILY_INTERVIEW_MIC_DISABLE_AT}
              onClick={toggleVoice}
              className="rounded-control bg-calm p-3 text-care focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic aria-hidden="true" className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={submitting || !familyInterviewInputSchema.safeParse(text).success}
            className="min-w-0 break-words rounded-control bg-care px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care disabled:cursor-not-allowed disabled:opacity-50"
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
