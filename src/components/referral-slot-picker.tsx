"use client";

import React, { useState } from "react";
import { CalendarPlus, Car, CheckCircle2, ShieldCheck } from "lucide-react";
import { ResourceReferral } from "@/components/resource-referral";
import { findKentuckyResources, type KentuckySdohResource } from "@/domain/sdoh-resources";
import type { ReferralDestination, Referral } from "@/domain/types";
import { tScreening, type Language } from "@/i18n/strings";

const hasStage = (referral: Referral, stage: Referral["stageHistory"][number]["stage"]) =>
  referral.stageHistory.some((entry) => entry.stage === stage);

// In-network slot booking: three real slots, soonest first, then the coverage
// note, a ride re-ask, and the honest self-reported "I went" closure.
export function ReferralSlotPicker({
  referral,
  destination,
  language,
  county,
  onBookSlot,
  onWent,
  onShareReferral
}: {
  referral: Referral;
  destination: ReferralDestination;
  language: Language;
  county: string;
  onBookSlot: (slot: string) => void;
  onWent: () => void;
  onShareReferral: (resource: KentuckySdohResource) => void;
}) {
  const [rideAnswer, setRideAnswer] = useState<"yes" | "no" | null>(null);
  const scheduled = hasStage(referral, "scheduled");
  const completed = hasStage(referral, "completed");
  const rideResources = rideAnswer === "no" ? findKentuckyResources({ county, needType: "transportation" }) : [];

  if (!scheduled) {
    if (destination.nextSlots.length === 0) {
      // Out-of-network / no published slots: the expect-a-call path stands.
      return null;
    }
    return (
      <div className="mt-4 border-t border-ink/10 pt-4">
        <p className="text-sm font-semibold">{tScreening(language, "slotPickerTitle")}</p>
        <div className="mt-2 space-y-2">
          {destination.nextSlots.slice(0, 3).map((slot) => (
            <button
              key={slot}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
              onClick={() => onBookSlot(slot)}
              type="button"
            >
              <CalendarPlus aria-hidden="true" className="h-4 w-4" />
              {slot}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
      <p className="text-sm font-semibold">{tScreening(language, "bookedForLine", { when: referral.scheduledFor ?? "" })}</p>
      <p className="flex items-start gap-2 text-sm leading-6 text-ink/80">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-care" />
        {destination.coverageNote}
      </p>

      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Car aria-hidden="true" className="h-4 w-4 text-care" />
          {tScreening(language, "rideReAsk")}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            className={
              rideAnswer === "yes"
                ? "min-h-12 flex-1 rounded-control bg-care px-3 py-2 text-sm font-semibold text-white"
                : "min-h-12 flex-1 rounded-control border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink/80"
            }
            onClick={() => setRideAnswer("yes")}
            type="button"
          >
            {tScreening(language, "rideYes")}
          </button>
          <button
            className={
              rideAnswer === "no"
                ? "min-h-12 flex-1 rounded-control bg-care px-3 py-2 text-sm font-semibold text-white"
                : "min-h-12 flex-1 rounded-control border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink/80"
            }
            onClick={() => setRideAnswer("no")}
            type="button"
          >
            {tScreening(language, "rideNo")}
          </button>
        </div>
        {rideAnswer === "no" ? (
          <div className="mt-3 space-y-3">
            <h4 className="text-sm font-semibold text-ink/80">{tScreening(language, "rideResourcesTitle")}</h4>
            {rideResources.map((resource) => (
              <ResourceReferral key={resource.id} language={language} onShare={onShareReferral} resource={resource} />
            ))}
          </div>
        ) : null}
      </div>

      {completed ? (
        <p className="flex items-center gap-2 text-sm font-medium text-care">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          {tScreening(language, "stageCompleted")} · {tScreening(language, "completedNote")}
        </p>
      ) : (
        <button
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
          onClick={onWent}
          type="button"
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          {tScreening(language, "wentCta")}
        </button>
      )}
    </div>
  );
}
