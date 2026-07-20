"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronDown, ChevronRight, GraduationCap, Send, Sparkles } from "lucide-react";
import { classifyCrisis } from "@/domain/safety";
import {
  EDUCATION_CHIPS,
  RETINOPATHY_TOPICS,
  answerEducationQuestion
} from "@/domain/retinopathy-education";
import type { Language } from "@/i18n/strings";
import { ReadAloud } from "@/voice/read-aloud";

type AnswerState =
  | { tone: "answer"; text: string; source: string }
  | { tone: "muted"; text: string }
  | { tone: "alert"; text: string; ask: string };

function EducationQa({ language }: { language: Language }) {
  const [result, setResult] = useState<AnswerState | null>(null);
  const [text, setText] = useState("");

  function ask(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    // The same hardened crisis gate the Coach uses. An acute eye symptom is never
    // answered with reassuring education — it is handed to a person via the Coach.
    if (classifyCrisis(trimmed).matched) {
      setResult({
        tone: "alert",
        text: "That could be urgent. Sandy can't diagnose this, so a person should help you right away.",
        ask: trimmed
      });
      return;
    }

    const answer = answerEducationQuestion(trimmed);
    if (answer.kind === "answer") {
      setResult({ tone: "answer", text: answer.text, source: answer.source });
    } else {
      setResult({ tone: "muted", text: answer.text });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {EDUCATION_CHIPS.map((chip) => (
          <button
            key={chip}
            className="rounded-full border border-care/40 bg-white px-3 py-1.5 text-sm font-semibold text-care hover:bg-calm"
            onClick={() => ask(chip)}
            type="button"
          >
            {chip}
          </button>
        ))}
      </div>

      {result?.tone === "alert" ? (
        <div className="rounded-control border border-pulse/30 bg-pulse/10 p-3 text-sm text-ink">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-pulse">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            This may be urgent
          </p>
          <p>{result.text}</p>
          <Link
            className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-control bg-pulse px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            href={`/chat?ask=${encodeURIComponent(result.ask)}`}
          >
            Get help in the Coach <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {result?.tone === "answer" ? (
        <div className="rounded-control border border-care/20 bg-calm p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase text-care">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Sandy
          </p>
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm leading-6 text-ink">{result.text}</p>
            <ReadAloud text={result.text} language={language} />
          </div>
          <p className="mt-2 text-xs font-medium text-ink/55">{result.source}</p>
        </div>
      ) : null}

      {result?.tone === "muted" ? (
        <div className="flex items-start gap-2 rounded-control bg-paper p-3 text-sm leading-6 text-ink">
          <p className="min-w-0 flex-1">{result.text}</p>
          <ReadAloud text={result.text} language={language} />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          className="min-h-11 min-w-0 flex-1 rounded-control border border-ink/20 px-3 py-2 text-sm"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              ask(text);
              setText("");
            }
          }}
          placeholder="Ask Sandy about diabetic retinopathy..."
          value={text}
        />
        <button
          aria-label="Ask"
          className="flex min-h-11 items-center justify-center rounded-control bg-care p-2.5 text-white hover:opacity-90"
          onClick={() => {
            ask(text);
            setText("");
          }}
          type="button"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs leading-5 text-ink/55">
        Sandy answers in plain language. This is general education, not a diagnosis. Urgent symptoms go to a person right away.
      </p>
    </div>
  );
}

export function RetinopathyLearn({ language }: { language: Language }) {
  const [open, setOpen] = useState<string | null>(RETINOPATHY_TOPICS[0]?.id ?? null);

  // English-first, Spanish gated: matches the app's pattern of routing Spanish
  // free-text to the Coach rather than shipping half-translated curriculum copy.
  if (language === "es") {
    return (
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <p className="text-sm leading-6 text-ink/80">
          Sandy puede explicarte la retinopatía diabética y el examen de los ojos. Pregúntale en el asistente.
        </p>
        <Link
          className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-control bg-care px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          href="/chat"
        >
          Hablar con Sandy <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-ink/80">
        Sandy can explain diabetic retinopathy and the eye screening in plain language. Tap a question, or ask your own.
      </p>

      <EducationQa language={language} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Learn the basics</h2>
        {RETINOPATHY_TOPICS.map((topic) => {
          const isOpen = open === topic.id;
          return (
            <div key={topic.id} className="overflow-hidden rounded-control border border-ink/10 bg-white">
              <button
                aria-expanded={isOpen}
                className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-3 text-left font-semibold text-ink hover:bg-calm"
                onClick={() => setOpen(isOpen ? null : topic.id)}
                type="button"
              >
                <span>{topic.title}</span>
                {isOpen ? (
                  <ChevronDown aria-hidden="true" className="h-4 w-4 flex-none text-ink/50" />
                ) : (
                  <ChevronRight aria-hidden="true" className="h-4 w-4 flex-none text-ink/50" />
                )}
              </button>
              {isOpen ? <div className="border-t border-ink/10 px-4 py-3 text-sm leading-6 text-ink/80">{topic.body}</div> : null}
            </div>
          );
        })}
      </section>

      <section className="rounded-control border border-note/40 bg-note/10 p-3 text-xs leading-5 text-ink">
        Sudden vision changes, new flashes or floaters, a curtain or shadow over your vision, or eye pain go to a person right away — use the Coach or call your care team.
      </section>

      <Link
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-care px-4 py-3 text-base font-semibold text-white hover:opacity-90"
        href="/screening"
      >
        <GraduationCap aria-hidden="true" className="h-5 w-5" />
        Find a screening near me
        <ArrowRight aria-hidden="true" className="h-5 w-5" />
      </Link>
    </div>
  );
}
