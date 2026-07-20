"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { requestFamilyInterview } from "@/ai/family-interview-provider";
import { extractFamilyInterviewMock, type FamilyFollowUp, type FamilyInterviewResult } from "@/domain/family-interview";
import { classifyCrisis, classifySafety } from "@/domain/safety";
import { screenSocialEmergency } from "@/domain/social-screen";
import type { FamilyProfile } from "@/domain/types";
import { tFamily } from "@/i18n/family-strings";
import type { Language } from "@/i18n/strings";
import { tVoice } from "@/i18n/voice-strings";
import { speak, stopSpeaking } from "@/voice/tts";
import type { VoiceEntryContext } from "@/voice/voice-consent";
import { ReadAloud } from "@/voice/read-aloud";
import {
  FamilyFollowUpTurn,
  FAMILY_FOLLOW_UP_ANSWER_MAX
} from "./family-follow-up-turn";
import {
  FAMILY_INTERVIEW_MAX_CHARS,
  FamilyInterview,
  sanitizeResult,
  type FamilyInterviewSubmissionMeta,
  type SanitizedFamilyInterviewResult
} from "./family-interview";

export { FAMILY_FOLLOW_UP_ANSWER_MAX };
export const FAMILY_ORIENTATION_MAX_ROUNDS = 2;

type OrientationRound = {
  question: FamilyFollowUp;
  answer?: string;
  source?: "typed" | "voice";
};

type OrientationState = {
  openingText: string;
  openingSource: "typed" | "voice" | "mixed";
  rounds: OrientationRound[];
  pendingFollowUps: FamilyFollowUp[];
  status: "idle" | "active" | "submitting" | "complete";
};

export type FamilyOrientationInterviewProps = {
  profile: FamilyProfile;
  draft: string;
  passcode?: string;
  language: Language;
  voiceEntryContext?: VoiceEntryContext;
  onDraftChange: (draft: string) => void;
  onInterviewExtracted: (
    result: SanitizedFamilyInterviewResult,
    meta: FamilyInterviewSubmissionMeta,
    context: { round: number }
  ) => void;
  onSafetyEscalation: () => void;
};

const FOLLOW_UP_TRANSCRIPT_RESERVE = 200 + FAMILY_FOLLOW_UP_ANSWER_MAX + 8;
const CONTROL_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care";

function initialOrientationState(): OrientationState {
  return { openingText: "", openingSource: "typed", rounds: [], pendingFollowUps: [], status: "idle" };
}

function orientationContextKey(profile: FamilyProfile, language: Language): string {
  return JSON.stringify({ profile, language });
}

function uniqueUnaskedFollowUps(followUps: readonly FamilyFollowUp[], askedQuestions: readonly string[]): FamilyFollowUp[] {
  const seen = new Set(askedQuestions);
  return followUps.filter(({ question }) => {
    if (seen.has(question)) return false;
    seen.add(question);
    return true;
  });
}

function fullTranscript(openingText: string, rounds: readonly OrientationRound[]): string {
  return rounds.reduce(
    (transcript, { question, answer }) =>
      answer === undefined ? transcript : `${transcript}\nQ: ${question.question}\nA: ${answer}`,
    openingText
  );
}

function familyOnlyTranscript(openingText: string, rounds: readonly OrientationRound[]): string {
  const answers = rounds.flatMap(({ answer }) => (answer === undefined ? [] : [answer]));
  return [openingText, ...answers].join("\n");
}

function hasFollowUpHeadroom(transcript: string): boolean {
  return FAMILY_INTERVIEW_MAX_CHARS - transcript.length - FOLLOW_UP_TRANSCRIPT_RESERVE >= 0;
}

function combinedSource(sources: readonly ("typed" | "voice" | "mixed" | undefined)[]): "typed" | "voice" | "mixed" {
  const present = sources.filter((source): source is "typed" | "voice" | "mixed" => source !== undefined);
  if (present.includes("mixed") || (present.includes("typed") && present.includes("voice"))) return "mixed";
  return present.includes("voice") ? "voice" : "typed";
}

function formatSpokenOptions(options: readonly string[], language: Language): string {
  if (options.length < 2) return options[0] ?? "";
  const conjunction = language === "es" ? "o" : "or";
  if (options.length === 2) return `${options[0]} ${conjunction} ${options[1]}`;
  return `${options.slice(0, -1).join(", ")}, ${conjunction} ${options.at(-1)}`;
}

export function FamilyOrientationInterview({
  profile,
  draft,
  passcode,
  language,
  voiceEntryContext,
  onDraftChange,
  onInterviewExtracted,
  onSafetyEscalation
}: FamilyOrientationInterviewProps) {
  const router = useRouter();
  const [thread, setThread] = useState<OrientationState>(initialOrientationState);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const contextKey = orientationContextKey(profile, language);
  const previousContextKeyRef = useRef(contextKey);
  const latestContextKeyRef = useRef(contextKey);
  latestContextKeyRef.current = contextKey;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (previousContextKeyRef.current === contextKey) return;
    stopSpeaking();
    previousContextKeyRef.current = contextKey;
    submittingRef.current = false;
    setThread(initialOrientationState());
  }, [contextKey]);

  const currentQuestion = thread.status === "active" ? thread.rounds.at(-1)?.question : undefined;

  useEffect(() => {
    if (!currentQuestion) return;
    let cancelled = false;
    const speakRound = async (): Promise<void> => {
      stopSpeaking();
      await speak(currentQuestion.question, { language });
      if (cancelled || currentQuestion.options.length === 0) return;
      await speak(
        tVoice(language, "chipsSpoken", { options: formatSpokenOptions(currentQuestion.options, language) }),
        { language }
      );
    };
    void speakRound();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [currentQuestion, language]);

  useEffect(() => {
    if (thread.status !== "complete") return;
    void speak(tFamily(language, "orientationComplete"), { language });
  }, [language, thread.status]);

  function resetThread(): void {
    stopSpeaking();
    submittingRef.current = false;
    setThread(initialOrientationState());
  }

  function receiveOpening(result: SanitizedFamilyInterviewResult, meta: FamilyInterviewSubmissionMeta): void {
    onInterviewExtracted(result, meta, { round: 0 });
    const candidates = uniqueUnaskedFollowUps(result.followUps, []);
    const canAsk = candidates.length > 0 && hasFollowUpHeadroom(meta.rawText);
    setThread({
      openingText: meta.rawText,
      openingSource: meta.source,
      rounds: canAsk ? [{ question: candidates[0] }] : [],
      pendingFollowUps: canAsk ? candidates.slice(1) : [],
      status: canAsk ? "active" : "complete"
    });
  }

  async function answerFollowUp(text: string, via: "chip" | "typed" | "voice"): Promise<void> {
    if (submittingRef.current || thread.status !== "active") return;
    const currentRound = thread.rounds[thread.rounds.length - 1];
    if (!currentRound || currentRound.answer !== undefined) return;
    const answer = text.trim();
    if (!answer) return;

    submittingRef.current = true;
    if (
      classifyCrisis(answer).matched ||
      classifySafety(answer).level !== "allowed" ||
      screenSocialEmergency(answer)
    ) {
      onSafetyEscalation();
      router.push(`/chat?ask=${encodeURIComponent(answer)}`);
      resetThread();
      return;
    }

    const answeredRounds = [
      ...thread.rounds.slice(0, -1),
      { ...currentRound, answer, source: via === "voice" ? "voice" as const : "typed" as const }
    ];
    const liveTranscript = fullTranscript(thread.openingText, answeredRounds);
    const caregiverTranscript = familyOnlyTranscript(thread.openingText, answeredRounds);
    if (liveTranscript.length > FAMILY_INTERVIEW_MAX_CHARS) {
      submittingRef.current = false;
      setThread({ ...thread, rounds: answeredRounds, pendingFollowUps: [], status: "complete" });
      return;
    }

    const snapshot = {
      profile: {
        ...profile,
        diagnoses: profile.diagnoses.map((diagnosis) => ({ ...diagnosis }))
      },
      passcode,
      language,
      contextKey: latestContextKeyRef.current
    } as const;
    setThread({ ...thread, rounds: answeredRounds, status: "submitting" });

    try {
      let live: FamilyInterviewResult | null = null;
      try {
        live = await requestFamilyInterview({
          text: liveTranscript,
          profile: snapshot.profile,
          passcode: snapshot.passcode,
          language: snapshot.language
        });
      } catch {
        live = null;
      }
      if (!mountedRef.current || latestContextKeyRef.current !== snapshot.contextKey) return;

      const extraction = live ? "live" : "mock";
      const extracted =
        live ?? extractFamilyInterviewMock(caregiverTranscript, snapshot.profile, new Date(), snapshot.language);
      const sanitized = sanitizeResult(extracted, snapshot.profile, caregiverTranscript);
      const round = answeredRounds.length;
      onInterviewExtracted(
        sanitized,
        {
          extraction,
          source: combinedSource([thread.openingSource, ...answeredRounds.map(({ source }) => source)]),
          rawText: caregiverTranscript
        },
        { round }
      );

      const candidates = uniqueUnaskedFollowUps(
        sanitized.followUps,
        answeredRounds.map(({ question }) => question.question)
      );
      const canContinue =
        round < FAMILY_ORIENTATION_MAX_ROUNDS &&
        candidates.length > 0 &&
        hasFollowUpHeadroom(liveTranscript);
      setThread({
        openingText: thread.openingText,
        openingSource: thread.openingSource,
        rounds: canContinue ? [...answeredRounds, { question: candidates[0] }] : answeredRounds,
        pendingFollowUps: canContinue ? candidates.slice(1) : [],
        status: canContinue ? "active" : "complete"
      });
    } finally {
      submittingRef.current = false;
      if (mountedRef.current && latestContextKeyRef.current !== snapshot.contextKey) {
        setThread(initialOrientationState());
      }
    }
  }

  if (thread.status === "idle") {
    return (
      <FamilyInterview
        profile={profile}
        draft={draft}
        passcode={passcode}
        language={language}
        onDraftChange={onDraftChange}
        onExtracted={receiveOpening}
        onSafetyEscalation={onSafetyEscalation}
      />
    );
  }

  const currentRound = thread.status === "active" ? thread.rounds[thread.rounds.length - 1] : undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-3" role="log" aria-live="polite">
        <div className="ml-auto max-w-[90%] rounded-control bg-care/10 p-3">
          <p className="break-words whitespace-pre-wrap">{thread.openingText}</p>
        </div>
        {thread.rounds.map(({ question, answer }, index) =>
          answer === undefined ? null : (
            <React.Fragment key={`${index}-${question.question}`}>
              <div className="mr-auto max-w-[90%] rounded-control border border-ink/10 bg-white p-3">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 break-words font-semibold">{question.question}</p>
                  <ReadAloud text={question.question} language={language} />
                </div>
              </div>
              <div className="ml-auto max-w-[90%] rounded-control bg-care/10 p-3">
                <p className="break-words whitespace-pre-wrap">{answer}</p>
              </div>
            </React.Fragment>
          )
        )}
      </div>

      {currentRound ? (
        <FamilyFollowUpTurn
          key={currentRound.question.question}
          question={currentRound.question}
          round={thread.rounds.length}
          roundCap={FAMILY_ORIENTATION_MAX_ROUNDS}
          language={language}
          submitting={false}
          voiceEntryContext={voiceEntryContext}
          onAnswer={(answer, via) => void answerFollowUp(answer, via)}
        />
      ) : null}

      {thread.status === "submitting" ? (
        <p role="status" aria-live="polite" className="text-sm font-semibold text-care">
          {tFamily(language, "interviewWorking")}
        </p>
      ) : null}

      {thread.status === "complete" ? (
        <div role="status" tabIndex={-1} className="flex items-start gap-2 rounded-control bg-care/10 p-4 font-semibold text-care">
          <p className="min-w-0 flex-1">{tFamily(language, "orientationComplete")}</p>
          <ReadAloud text={tFamily(language, "orientationComplete")} language={language} />
        </div>
      ) : null}

      <button
        type="button"
        disabled={thread.status === "submitting"}
        onClick={resetThread}
        className={`min-h-12 min-w-0 break-words rounded-control border border-care/30 bg-white px-4 py-2 font-semibold text-care disabled:cursor-not-allowed disabled:opacity-50 ${CONTROL_FOCUS}`}
      >
        {tFamily(language, "orientationStartOver")}
      </button>
    </div>
  );
}
