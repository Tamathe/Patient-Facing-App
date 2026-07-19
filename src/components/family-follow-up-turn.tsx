"use client";

import React, { useEffect, useRef, useState } from "react";
import type { FamilyFollowUp } from "@/domain/family-interview";
import { tFamily } from "@/i18n/family-strings";
import type { Language } from "@/i18n/strings";

export const FAMILY_FOLLOW_UP_ANSWER_MAX = 500;

export type FamilyFollowUpTurnProps = {
  question: FamilyFollowUp;
  round: number;
  roundCap: number;
  language: Language;
  submitting: boolean;
  onAnswer: (text: string, via: "chip" | "typed") => void;
};

const CONTROL_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care";

export function FamilyFollowUpTurn({
  question,
  round,
  roundCap,
  language,
  submitting,
  onAnswer
}: FamilyFollowUpTurnProps) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);
  const questionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setAnswer("");
    setError(false);
    if (round > 1) {
      questionRef.current?.focus();
    }
  }, [question.question, round]);

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    onAnswer(trimmed, "typed");
  }

  return (
    <section className="rounded-control border border-care/20 bg-white p-4" aria-labelledby="family-follow-up-question">
      <p className="text-sm font-semibold text-care" aria-live="polite">
        {tFamily(language, "orientationRoundCount", { round, max: roundCap })}
      </p>
      <h3
        id="family-follow-up-question"
        ref={questionRef}
        tabIndex={-1}
        className="mt-2 break-words text-lg font-semibold"
      >
        {question.question}
      </h3>
      {question.options.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={tFamily(language, "followUpChipsLabel")}>
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={submitting}
              onClick={() => onAnswer(option, "chip")}
              className={`min-h-12 min-w-0 break-words rounded-control border border-care/30 bg-care/5 px-4 py-2 text-left font-semibold text-care disabled:cursor-not-allowed disabled:opacity-50 ${CONTROL_FOCUS}`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      <form className="mt-4 grid gap-2" onSubmit={submit}>
        <label className="text-sm font-semibold" htmlFor={`family-follow-up-answer-${round}`}>
          {tFamily(language, "followUpAnswerLabel")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`family-follow-up-answer-${round}`}
            type="text"
            value={answer}
            maxLength={FAMILY_FOLLOW_UP_ANSWER_MAX}
            disabled={submitting}
            aria-invalid={error}
            aria-describedby={error ? `family-follow-up-error-${round}` : undefined}
            placeholder={tFamily(language, "followUpAnswerPlaceholder")}
            onChange={(event) => {
              setAnswer(event.target.value);
              if (error) setError(false);
            }}
            className={`min-h-12 min-w-0 flex-1 rounded-control border border-ink/20 bg-white px-3 py-2 ${CONTROL_FOCUS}`}
          />
          <button
            type="submit"
            disabled={submitting}
            className={`min-h-12 min-w-0 break-words rounded-control bg-care px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CONTROL_FOCUS}`}
          >
            {tFamily(language, "followUpAnswerSubmit")}
          </button>
        </div>
        {error ? (
          <p id={`family-follow-up-error-${round}`} role="alert" className="text-sm font-medium text-red-700">
            {tFamily(language, "followUpAnswerError")}
          </p>
        ) : null}
      </form>
    </section>
  );
}
