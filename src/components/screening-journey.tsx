"use client";

import React from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { screeningJourney } from "@/domain/screening-status";
import type { Referral, ScreeningResult } from "@/domain/types";
import { tScreening, type Language } from "@/i18n/strings";

// Closed-loop status: screened → referral sent → scheduled → completed.
export function ScreeningJourney({
  result,
  referral,
  language
}: {
  result: ScreeningResult;
  referral?: Referral;
  language: Language;
}) {
  const steps = screeningJourney(result, referral, language);

  return (
    <section className="rounded-control border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-semibold">{tScreening(language, "journeyTitle")}</h2>
      <ol className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-2 text-sm leading-6">
            {step.done ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-care" />
            ) : (
              <CircleDashed aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-ink/30" />
            )}
            <span className={step.done ? "text-ink" : "text-ink/50"}>{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
