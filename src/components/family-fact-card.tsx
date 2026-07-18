"use client";

import React, { useId } from "react";
import type { FamilyFact } from "@/domain/types";
import { tFamily, type FamilyStringKey } from "@/i18n/family-strings";
import type { Language } from "@/i18n/strings";

export type FamilyFactCardProps = {
  fact: FamilyFact;
  language: Language;
  onConfirm: (factId: string) => void;
};

const STATUS_KEYS: Record<FamilyFact["status"], FamilyStringKey> = {
  patient_reported: "evidencePatientReported",
  inferred: "evidenceInferred",
  confirmed: "evidenceConfirmed"
};

export function FamilyFactCard({ fact, language, onConfirm }: FamilyFactCardProps) {
  const titleId = useId();
  const confirmed = fact.status === "confirmed";

  return (
    <article className="rounded-control border border-ink/10 bg-white p-4" aria-labelledby={titleId}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="break-words font-semibold">
            {fact.label}
          </h3>
          <p className="mt-1 break-words text-sm leading-6 text-ink/80">{fact.value}</p>
        </div>
        <span className="rounded-full bg-calm px-2 py-1 text-xs font-semibold text-care">
          {tFamily(language, STATUS_KEYS[fact.status])}
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink/60">
        {tFamily(language, "factSource")}
      </p>
      <blockquote className="mt-1 break-words border-l-4 border-care/30 pl-3 text-sm text-ink/70">
        {fact.sourceSnippet}
      </blockquote>
      <div aria-live="polite">
        <button
          type="button"
          disabled={confirmed}
          aria-label={`${confirmed ? tFamily(language, "factConfirmed") : tFamily(language, "factConfirm")}: ${fact.label}`}
          onClick={() => onConfirm(fact.id)}
          className="mt-4 min-h-12 min-w-0 break-words rounded-control bg-care px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirmed ? tFamily(language, "factConfirmed") : tFamily(language, "factConfirm")}
        </button>
      </div>
    </article>
  );
}
