import Link from "next/link";
import React, { useState } from "react";
import {
  buildFamilyStages,
  type FamilyDiagnosisBackdateMonths,
  type FamilyStage
} from "@/domain/family-stages";
import type { FamilyNavigatorState } from "@/domain/types";
import { tFamily, type FamilyStringKey } from "@/i18n/family-strings";
import type { Language } from "@/i18n/strings";

export type FamilyStageTimelineProps = {
  family: FamilyNavigatorState;
  language: Language;
  now?: Date;
  nudgeFirstName?: string;
  onBackdateDiagnoses?: (monthsAgo: FamilyDiagnosisBackdateMonths, now: Date) => void;
};

const STAGE_TITLE_KEYS: Record<string, FamilyStringKey> = {
  "first-steps": "timelineFirstStepsTitle",
  "age-three-transition": "timelineAgeThreeTransitionTitle",
  "school-enrollment": "timelineSchoolEnrollmentTitle",
  "waiver-apply": "timelineWaiverApplyTitle",
  "school-arc": "timelineSchoolArcTitle",
  "parent-connection": "timelineParentConnectionTitle",
  "sibling-respite": "timelineSiblingRespiteTitle",
  "mission-transition": "timelineMissionTransitionTitle",
  "before-eighteen": "timelineBeforeEighteenTitle",
  "perinatal-check-1-month": "timelinePerinatalOneMonthTitle",
  "perinatal-check-2-month": "timelinePerinatalTwoMonthTitle",
  "perinatal-check-4-month": "timelinePerinatalFourMonthTitle",
  "perinatal-check-6-month": "timelinePerinatalSixMonthTitle",
  "development-check-18-month": "timelineDevelopmentEighteenTitle",
  "development-check-30-month": "timelineDevelopmentThirtyTitle"
};

const STAGE_CTA_KEYS: Partial<Record<string, FamilyStringKey>> = {
  "perinatal-check-1-month": "timelinePerinatalOneMonthCta",
  "perinatal-check-2-month": "timelinePerinatalTwoMonthCta",
  "perinatal-check-4-month": "timelinePerinatalFourMonthCta",
  "perinatal-check-6-month": "timelinePerinatalSixMonthCta",
  "development-check-18-month": "timelineDevelopmentEighteenCta",
  "development-check-30-month": "timelineDevelopmentThirtyCta"
};

const TIMING_KEYS: Record<FamilyStage["timing"], FamilyStringKey> = {
  now: "timelineNow",
  next: "timelineNext",
  later: "timelineLater"
};

const TIMINGS: FamilyStage["timing"][] = ["now", "next", "later"];

const BACKDATE_OPTIONS: Array<{
  monthsAgo: FamilyDiagnosisBackdateMonths;
  key: FamilyStringKey;
}> = [
  { monthsAgo: 0, key: "timelineDemoThisMonth" },
  { monthsAgo: 1, key: "timelineDemoOneMonthAgo" },
  { monthsAgo: 3, key: "timelineDemoThreeMonthsAgo" },
  { monthsAgo: 6, key: "timelineDemoSixMonthsAgo" }
];

export function FamilyStageTimeline({
  family,
  language,
  now = new Date(),
  nudgeFirstName,
  onBackdateDiagnoses
}: FamilyStageTimelineProps) {
  const [demoControlOpen, setDemoControlOpen] = useState(false);
  const stages = buildFamilyStages(family, now, language, nudgeFirstName);

  return (
    <section className="rounded-control border border-care/20 bg-white p-4" aria-labelledby="family-timeline-title">
      <h2 id="family-timeline-title" className="text-xl font-semibold">
        {tFamily(language, "timelineTitle")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-ink/75">{tFamily(language, "timelineIntro")}</p>
      {!family.profile ? (
        <p className="mt-4 text-sm text-ink/70">{tFamily(language, "timelineNoProfile")}</p>
      ) : (
        <>
          {family.profile.birthMonth === undefined ? (
            <p className="mt-3 rounded-control bg-note p-3 text-sm font-medium">
              {tFamily(language, "timelineYearOnlyNotice")}
            </p>
          ) : null}
          {family.profile.diagnoses.length > 0 && onBackdateDiagnoses ? (
            <div className="mt-4">
              <button
                type="button"
                aria-expanded={demoControlOpen}
                aria-controls="family-timeline-demo-panel"
                onClick={() => setDemoControlOpen((current) => !current)}
                className="min-h-11 rounded-control border border-care/30 bg-white px-3 py-2 text-sm font-semibold text-care focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
              >
                {tFamily(language, "timelineDemoControlTitle")}
              </button>
              {demoControlOpen ? (
                <fieldset id="family-timeline-demo-panel" className="mt-3 rounded-control border border-care/20 bg-calm/40 p-3">
                  <legend className="px-1 font-semibold text-care">
                    {tFamily(language, "timelineDemoControlTitle")}
                  </legend>
                  <p className="text-sm leading-6 text-ink/75">
                    {tFamily(language, "timelineDemoControlIntro")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {BACKDATE_OPTIONS.map(({ monthsAgo, key }) => (
                      <button
                        key={monthsAgo}
                        type="button"
                        onClick={() => onBackdateDiagnoses(monthsAgo, now)}
                        className="min-h-11 rounded-control border border-care bg-white px-3 py-2 text-sm font-semibold text-care focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
                      >
                        {tFamily(language, key)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>
          ) : null}
          {stages.length === 0 ? (
            <p className="mt-4 text-sm text-ink/70">{tFamily(language, "timelineEmpty")}</p>
          ) : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {TIMINGS.map((timing) => {
              const headingId = `family-timeline-${timing}`;
              const entries = stages.filter((stage) => stage.timing === timing);
              return (
                <section key={timing} aria-labelledby={headingId} className="min-w-0 rounded-control bg-paper p-3">
                  <h3 id={headingId} className="text-lg font-semibold text-care">
                    {tFamily(language, TIMING_KEYS[timing])}
                  </h3>
                  {entries.length > 0 ? (
                    <ul className="mt-3 grid gap-3">
                      {entries.map((stage) => {
                        const titleKey = STAGE_TITLE_KEYS[stage.id];
                        if (!titleKey) return null;
                        const ctaKey = STAGE_CTA_KEYS[stage.id];
                        return (
                          <li key={stage.id} className="min-w-0 rounded-control border border-ink/10 bg-white p-3">
                            <h4 className="break-words font-semibold">{tFamily(language, titleKey)}</h4>
                            <p className="mt-1 break-words text-sm leading-6 text-ink/75">
                              {stage.description}
                            </p>
                            {stage.href && ctaKey ? (
                              <Link
                                className="mt-3 inline-flex min-h-11 items-center font-semibold text-care underline"
                                href={stage.href}
                              >
                                {tFamily(language, ctaKey)}
                              </Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
