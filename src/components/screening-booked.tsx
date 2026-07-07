"use client";

import React, { useState } from "react";
import { CalendarCheck2, Car } from "lucide-react";
import { ResourceReferral } from "@/components/resource-referral";
import { findKentuckyResources, type KentuckySdohResource } from "@/domain/sdoh-resources";
import { tScreening, type Language } from "@/i18n/strings";

// The booked state: confirmation, the fear-killing what-to-expect card, and
// the transportation ask that turns "no ride" into a real sdoh referral.
export function ScreeningBooked({
  language,
  siteName,
  when,
  rideSupport,
  county,
  onShareReferral
}: {
  language: Language;
  siteName: string;
  when: string;
  rideSupport: boolean;
  county: string;
  onShareReferral: (resource: KentuckySdohResource) => void;
}) {
  const [rideAnswer, setRideAnswer] = useState<"yes" | "no" | null>(null);
  const rideResources = rideAnswer === "no" ? findKentuckyResources({ county, needType: "transportation" }) : [];

  return (
    <section className="space-y-4">
      <div className="rounded-control border border-care bg-white p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-care">
          <CalendarCheck2 aria-hidden="true" className="h-4 w-4" />
          {tScreening(language, "bookedTitle")}
        </p>
        <p className="mt-1 text-lg font-semibold">{tScreening(language, "bookedLine", { site: siteName, when })}</p>
      </div>

      <div className="rounded-control border border-ink/10 bg-white p-4">
        <h3 className="font-semibold">{tScreening(language, "whatToExpectTitle")}</h3>
        <p className="mt-1 text-sm leading-6 text-ink/80">{tScreening(language, "whatToExpectBody")}</p>
      </div>

      <div className="rounded-control border border-ink/10 bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Car aria-hidden="true" className="h-4 w-4 text-care" />
          {tScreening(language, "rideQuestion")}
        </h3>
        <div className="mt-3 flex gap-2">
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
        {rideAnswer === "yes" && rideSupport ? (
          <p className="mt-3 text-sm leading-6 text-ink/75">{tScreening(language, "rideSiteCovered")}</p>
        ) : null}
        {rideAnswer === "no" ? (
          <div className="mt-4 space-y-3">
            {rideSupport ? <p className="text-sm leading-6 text-ink/75">{tScreening(language, "rideSiteCovered")}</p> : null}
            <h4 className="text-sm font-semibold text-ink/80">{tScreening(language, "rideResourcesTitle")}</h4>
            {rideResources.map((resource) => (
              <ResourceReferral key={resource.id} language={language} onShare={onShareReferral} resource={resource} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
