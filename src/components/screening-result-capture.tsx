"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Camera, Check, Keyboard, ShieldAlert, X } from "lucide-react";
import { DEMO_REPORT_FILES, extractFromPhotoName, extractFromTypedEntry } from "@/domain/dr-report-extract";
import { gradeStringKey } from "@/domain/dr-triage";
import { classifyCrisis, classifySafety } from "@/domain/safety";
import { screenSocialEmergency } from "@/domain/social-screen";
import type { DrReportExtraction, ExtractionRefusal, ResultCaptureSource } from "@/domain/types";
import { tScreening, type Language, type ScreeningStringKey } from "@/i18n/strings";

type Stage =
  | { kind: "intro" }
  | { kind: "input"; typedOpen: boolean }
  | { kind: "review"; extraction: DrReportExtraction; source: ResultCaptureSource; reportRef: string }
  | { kind: "refusal"; refusal: ExtractionRefusal };

const REFUSAL_COPY: Record<ExtractionRefusal, ScreeningStringKey> = {
  unreadable: "refusalUnreadable",
  retinal_photograph: "refusalRetinalPhoto",
  not_a_report: "refusalNotAReport"
};

// Capture → extract → confirm. Every extraction requires explicit human
// confirmation before any state change; unknown input refuses, never guesses;
// typed free-text runs through the safety gate BEFORE any parsing, so crisis
// text takes the crisis path, never extraction.
export function ScreeningResultCapture({
  language,
  onConfirm,
  onSafetyIntercept,
  liveExtract
}: {
  language: Language;
  onConfirm: (extraction: DrReportExtraction, source: ResultCaptureSource, reportRef: string) => void;
  onSafetyIntercept: (text: string) => void;
  liveExtract?: (file: File) => Promise<DrReportExtraction | null>;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [typedText, setTypedText] = useState("");
  const [reading, setReading] = useState(false);

  function settle(extraction: DrReportExtraction, source: ResultCaptureSource, reportRef: string) {
    if (extraction.refusal) {
      setStage({ kind: "refusal", refusal: extraction.refusal });
      return;
    }
    setStage({ kind: "review", extraction, source, reportRef });
  }

  async function handleFile(file: File) {
    const byName = extractFromPhotoName(file.name);
    if (!byName.refusal) {
      settle(byName, "photo_report", file.name);
      return;
    }
    if (liveExtract) {
      setReading(true);
      const live = await liveExtract(file).catch(() => null);
      setReading(false);
      if (live) {
        settle(live, "photo_report", file.name);
        return;
      }
    }
    setStage({ kind: "refusal", refusal: byName.refusal });
  }

  function handleTyped() {
    const text = typedText.trim();
    if (text.length === 0) {
      return;
    }
    // Safety gate FIRST — crisis or unsafe text never reaches the parser.
    if (classifyCrisis(text).matched || classifySafety(text).level !== "allowed" || screenSocialEmergency(text)) {
      onSafetyIntercept(text);
      return;
    }
    settle(extractFromTypedEntry(text), "typed_entry", "typed-entry");
  }

  if (stage.kind === "intro") {
    return (
      <section className="space-y-4">
        <div className="rounded-control border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-semibold">{tScreening(language, "captureIntroTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/80">{tScreening(language, "captureIntroBody")}</p>
        </div>
        <div className="rounded-control border border-note/40 bg-note/10 p-4">
          <p className="flex items-start gap-2 text-sm leading-6 text-ink">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-note" />
            {tScreening(language, "captureBoundary")}
          </p>
        </div>
        <button
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-care px-4 py-3 text-base font-semibold text-white hover:opacity-90"
          onClick={() => setStage({ kind: "input", typedOpen: false })}
          type="button"
        >
          <Camera aria-hidden="true" className="h-5 w-5" />
          {tScreening(language, "captureStart")}
        </button>
      </section>
    );
  }

  if (stage.kind === "input") {
    return (
      <section className="space-y-4">
        <div className="rounded-control border border-ink/10 bg-white p-4">
          <label className="block text-sm font-medium" htmlFor="report-photo">
            {tScreening(language, "capturePhotoLabel")}
          </label>
          <input
            accept="image/*"
            className="mt-2 block w-full text-sm"
            disabled={reading}
            id="report-photo"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
            type="file"
          />
          <button
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-control border border-ink/15 px-4 py-2 text-sm font-semibold text-ink/80 hover:border-care"
            onClick={() => setStage({ kind: "input", typedOpen: true })}
            type="button"
          >
            <Keyboard aria-hidden="true" className="h-4 w-4" />
            {tScreening(language, "captureTypeInstead")}
          </button>
          {stage.typedOpen ? (
            <div className="mt-3">
              <label className="block text-sm font-medium" htmlFor="typed-report">
                {tScreening(language, "captureTypedLabel")}
              </label>
              <textarea
                className="mt-1 w-full rounded-control border border-ink/20 p-3 text-sm"
                id="typed-report"
                onChange={(event) => setTypedText(event.target.value)}
                placeholder={tScreening(language, "captureTypedPlaceholder")}
                rows={2}
                value={typedText}
              />
              <button
                className="mt-2 flex min-h-12 w-full items-center justify-center rounded-control bg-care px-4 py-2 text-sm font-semibold text-white"
                onClick={handleTyped}
                type="button"
              >
                {tScreening(language, "captureTypedSubmit")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-control border border-ink/10 bg-white p-4">
          <h3 className="font-semibold">{tScreening(language, "captureDemoTitle")}</h3>
          <p className="mt-1 text-xs text-ink/60">{tScreening(language, "captureDemoHint")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {DEMO_REPORT_FILES.map((file) => (
              <button
                key={file}
                className="rounded-control border border-ink/15 bg-paper p-2 text-left hover:border-care"
                onClick={() => settle(extractFromPhotoName(file), "photo_report", file)}
                type="button"
              >
                <Image alt={file} className="h-28 w-full rounded-sm object-cover object-top" height={112} src={`/demo-reports/${file}`} unoptimized width={160} />
                <span className="mt-1 block truncate text-xs font-medium text-ink/70">{file}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (stage.kind === "review") {
    const { extraction } = stage;
    const dmeKey: ScreeningStringKey =
      extraction.dmePresent === true ? "reviewDmeYes" : extraction.dmePresent === false ? "reviewDmeNo" : "reviewDmeUnknown";
    return (
      <section className="space-y-4">
        <div className="rounded-control border border-care bg-white p-4">
          <h2 className="text-lg font-semibold">{tScreening(language, "reviewTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-ink">{tScreening(language, gradeStringKey(extraction))}</p>
          <p className="mt-2 text-sm leading-6 text-ink/80">{tScreening(language, dmeKey)}</p>
          {extraction.fieldsRead.length > 0 ? (
            <div className="mt-3 rounded-control bg-paper p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {tScreening(language, "reviewFieldsTitle")}
              </p>
              <ul className="mt-1 space-y-1 text-xs leading-5 text-ink/70">
                {extraction.fieldsRead.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-control bg-care px-4 py-3 text-base font-semibold text-white hover:opacity-90"
            onClick={() => onConfirm(stage.extraction, stage.source, stage.reportRef)}
            type="button"
          >
            <Check aria-hidden="true" className="h-5 w-5" />
            {tScreening(language, "confirmRight")}
          </button>
          <button
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-control border border-ink/20 bg-white px-4 py-3 text-base font-semibold text-ink/80 hover:border-care"
            onClick={() => setStage({ kind: "input", typedOpen: true })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
            {tScreening(language, "confirmWrong")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-control border border-note/40 bg-note/10 p-4">
        <p className="text-sm leading-6 text-ink">{tScreening(language, REFUSAL_COPY[stage.refusal])}</p>
      </div>
      <button
        className="flex min-h-12 w-full items-center justify-center rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
        onClick={() => setStage({ kind: "input", typedOpen: true })}
        type="button"
      >
        {tScreening(language, "refusalTryAgain")}
      </button>
    </section>
  );
}
