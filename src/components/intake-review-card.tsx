import type { ExtractedFact } from "@/domain/types";
import React from "react";

const statusLabel: Record<ExtractedFact["status"], string> = {
  confirmed: "Confirmed",
  patient_reported: "Patient Reported",
  imported: "Imported",
  inferred: "Likely Inferred",
  needs_review: "Needs Review"
};

export function IntakeReviewCard({ fact, onConfirm }: { fact: ExtractedFact; onConfirm: () => void }) {
  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{fact.label}</h2>
          <p className="mt-1 text-sm leading-6">{fact.value}</p>
        </div>
        <div className="grid gap-2 text-right">
          <span className="rounded-control bg-note px-2 py-1 text-xs font-semibold">Confidence: {fact.confidence}</span>
          <span className="rounded-control bg-calm px-2 py-1 text-xs font-semibold">Status: {statusLabel[fact.status]}</span>
        </div>
      </div>
      <blockquote className="mt-3 border-l-4 border-care/40 pl-3 text-sm text-ink/70">{fact.sourceSnippet}</blockquote>
      <button
        className="mt-4 rounded-control bg-care px-4 py-2 text-sm font-semibold text-white"
        disabled={fact.status === "confirmed"}
        onClick={onConfirm}
        type="button"
      >
        {fact.status === "confirmed" ? "Confirmed" : "Confirm"}
      </button>
    </article>
  );
}
