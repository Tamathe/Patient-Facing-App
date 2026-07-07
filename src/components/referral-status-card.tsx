"use client";

import React from "react";
import { Check, CircleDashed, Send } from "lucide-react";
import { expectCallWithinDays } from "@/domain/dr-triage";
import type { ReferralDestination, Referral, ReferralStage } from "@/domain/types";
import { tScreening, type Language, type ScreeningStringKey } from "@/i18n/strings";

const TIMELINE_STAGES: ReferralStage[] = ["drafted", "sent", "clinic_confirmed", "scheduled", "completed"];

const STAGE_LABEL_KEY: Record<Exclude<ReferralStage, "stalled">, ScreeningStringKey> = {
  drafted: "stageDrafted",
  sent: "stageSent",
  clinic_confirmed: "stageConfirmed",
  scheduled: "stageScheduled",
  completed: "stageCompleted"
};

export function referralHasStage(referral: Referral, stage: ReferralStage): boolean {
  return referral.stageHistory.some((entry) => entry.stage === stage);
}

// Patient-visible referral status: where it went, when to expect the call, and
// an honest stage timeline. A stalled referral says the care team has been
// pulled in — it never quietly resets.
export function ReferralStatusCard({
  referral,
  destination,
  language,
  children
}: {
  referral: Referral;
  destination: ReferralDestination;
  language: Language;
  children?: React.ReactNode;
}) {
  const days = expectCallWithinDays(referral.tier) ?? 5;
  const kind = tScreening(language, destination.kind === "retina" ? "kindRetina" : "kindOptometrist");
  const stalled = referralHasStage(referral, "stalled");
  const reachedIndex = TIMELINE_STAGES.reduce(
    (highest, stage, index) => (referralHasStage(referral, stage) ? index : highest),
    0
  );

  return (
    <section className="rounded-control border border-ink/10 bg-white p-4">
      <p className="flex items-start gap-2 text-sm font-medium leading-6 text-ink">
        <Send aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-care" />
        <span>
          {tScreening(language, "referralWentTo", {
            name: destination.name,
            kind,
            miles: destination.distanceMiles,
            days
          })}
        </span>
      </p>

      <ol className="mt-4 space-y-2">
        {TIMELINE_STAGES.map((stage, index) => {
          const reached = index <= reachedIndex && referralHasStage(referral, stage);
          const isCurrent = index === reachedIndex;
          const entry = referral.stageHistory.find((candidate) => candidate.stage === stage);
          return (
            <li key={stage} className="flex items-start gap-2 text-sm">
              {reached ? (
                <Check aria-hidden="true" className={`mt-0.5 h-4 w-4 flex-none ${isCurrent ? "text-care" : "text-ink/40"}`} />
              ) : (
                <CircleDashed aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-ink/25" />
              )}
              <span className={reached ? (isCurrent ? "font-semibold text-care" : "text-ink/70") : "text-ink/40"}>
                {tScreening(language, STAGE_LABEL_KEY[stage as Exclude<ReferralStage, "stalled">])}
                {entry ? <span className="ml-2 text-xs font-normal text-ink/50">{entry.note}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>

      {stalled && !referralHasStage(referral, "clinic_confirmed") && !referralHasStage(referral, "scheduled") ? (
        <p className="mt-4 rounded-control border border-note/40 bg-note/10 p-3 text-sm font-medium leading-6 text-ink">
          {tScreening(language, "stalledNotice")}
        </p>
      ) : null}

      {children}
    </section>
  );
}
