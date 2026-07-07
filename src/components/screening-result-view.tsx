"use client";

import React from "react";
import { FileCheck2 } from "lucide-react";
import { gradeStringKey } from "@/domain/dr-triage";
import type { ScreeningResult } from "@/domain/types";
import { tScreening, type Language, type ScreeningStringKey } from "@/i18n/strings";

// The confirmed-result view: the LOCKED plain-language copy plus an honest
// provenance line (grounding-facts pattern) — the app read a report the
// patient confirmed; it never graded an eye.
export function ScreeningResultView({
  result,
  language,
  children
}: {
  result: ScreeningResult;
  language: Language;
  children?: React.ReactNode;
}) {
  const dmeKey: ScreeningStringKey =
    result.dmePresent === true ? "reviewDmeYes" : result.dmePresent === false ? "reviewDmeNo" : "reviewDmeUnknown";

  return (
    <section className="space-y-4">
      <div className="rounded-control border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-semibold">{tScreening(language, "resultTitle")}</h2>
        <p className="mt-2 text-base leading-7 text-ink">
          {tScreening(language, gradeStringKey({ grade: result.grade, dmePresent: result.dmePresent, ungradable: result.outcome === "ungradable" }))}
        </p>
        <p className="mt-2 text-sm leading-6 text-ink/75">{tScreening(language, dmeKey)}</p>
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-ink/60">
          <FileCheck2 aria-hidden="true" className="h-4 w-4 text-care" />
          {tScreening(language, result.source === "photo_report" ? "provenancePhoto" : "provenanceTyped")}
          {" · "}
          {new Date(result.confirmedAt).toLocaleDateString()}
        </p>
      </div>
      {children}
    </section>
  );
}
