import React from "react";
import { buildFamilyStages, type FamilyStage } from "@/domain/family-stages";
import type { FamilyNavigatorState } from "@/domain/types";
import { tFamily, type FamilyStringKey } from "@/i18n/family-strings";
import type { Language } from "@/i18n/strings";

export type FamilyStageTimelineProps = {
  family: FamilyNavigatorState;
  language: Language;
  now?: Date;
};

const STAGE_KEYS: Record<string, { title: FamilyStringKey; body: FamilyStringKey }> = {
  "first-steps": { title: "timelineFirstStepsTitle", body: "timelineFirstStepsBody" },
  "age-three-transition": {
    title: "timelineAgeThreeTransitionTitle",
    body: "timelineAgeThreeTransitionBody"
  },
  "school-enrollment": { title: "timelineSchoolEnrollmentTitle", body: "timelineSchoolEnrollmentBody" },
  "waiver-apply": { title: "timelineWaiverApplyTitle", body: "timelineWaiverApplyBody" },
  "school-arc": { title: "timelineSchoolArcTitle", body: "timelineSchoolArcBody" },
  "parent-connection": {
    title: "timelineParentConnectionTitle",
    body: "timelineParentConnectionBody"
  },
  "sibling-respite": { title: "timelineSiblingRespiteTitle", body: "timelineSiblingRespiteBody" },
  "mission-transition": {
    title: "timelineMissionTransitionTitle",
    body: "timelineMissionTransitionBody"
  },
  "before-eighteen": { title: "timelineBeforeEighteenTitle", body: "timelineBeforeEighteenBody" }
};

const TIMING_KEYS: Record<FamilyStage["timing"], FamilyStringKey> = {
  now: "timelineNow",
  next: "timelineNext",
  later: "timelineLater"
};

const TIMINGS: FamilyStage["timing"][] = ["now", "next", "later"];

export function FamilyStageTimeline({ family, language, now = new Date() }: FamilyStageTimelineProps) {
  const stages = buildFamilyStages(family, now);

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
                        const keys = STAGE_KEYS[stage.id];
                        if (!keys) return null;
                        return (
                          <li key={stage.id} className="min-w-0 rounded-control border border-ink/10 bg-white p-3">
                            <h4 className="break-words font-semibold">{tFamily(language, keys.title)}</h4>
                            <p className="mt-1 break-words text-sm leading-6 text-ink/75">
                              {tFamily(language, keys.body)}
                            </p>
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
