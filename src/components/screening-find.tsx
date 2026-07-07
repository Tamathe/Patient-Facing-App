"use client";

import React, { useMemo, useState } from "react";
import { Building2, Camera, Car, Clock, DollarSign, Eye, MapPin, Pill, ShieldCheck, ShoppingCart, Stethoscope, Truck, type LucideIcon } from "lucide-react";
import { SCREENING_COVERAGE_OPTIONS, bestCoverageOptionForSite } from "@/domain/coverage-logistics";
import { withDistances, isKnownZip, type SiteWithDistance } from "@/domain/ky-geo";
import { SCREENING_SITES, equityGap, explainMatch, rankSites, venueLabel, type MatchMode } from "@/domain/screening-sites";
import type { ScreeningVenueType } from "@/domain/types";
import { tScreening, type Language } from "@/i18n/strings";

const MODES: MatchMode[] = ["best", "fastest", "closest"];

const VENUE_ICON: Record<ScreeningVenueType, LucideIcon> = {
  fqhc: Building2,
  mobile_clinic: Truck,
  community_camera: Camera,
  eye_clinic: Eye,
  kroger: ShoppingCart,
  pharmacy: Pill,
  primary_care: Stethoscope
};

// Find & book: one recommendation first, the ranked list only on request.
export function ScreeningFind({
  language,
  initialZip,
  canBook,
  onBook
}: {
  language: Language;
  initialZip: string;
  canBook: boolean;
  onBook: (site: SiteWithDistance) => void;
}) {
  const [zip, setZip] = useState(initialZip);
  const [mode, setMode] = useState<MatchMode>("best");
  const [showAll, setShowAll] = useState(false);

  const ranked = useMemo(() => rankSites(withDistances(SCREENING_SITES, zip), mode), [zip, mode]);
  const top = ranked[0];
  const equity = useMemo(() => equityGap(ranked), [ranked]);

  const modeLabel: Record<MatchMode, string> = {
    best: tScreening(language, "modeBest"),
    fastest: tScreening(language, "modeFastest"),
    closest: tScreening(language, "modeClosest")
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{tScreening(language, "findTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-ink/75">{tScreening(language, "findIntro")}</p>
      </div>

      <div className="rounded-control border border-ink/10 bg-white p-4">
        <label className="text-sm font-medium" htmlFor="screening-zip">
          {tScreening(language, "zipLabel")}
        </label>
        <input
          className="mt-1 w-full rounded-control border border-ink/20 p-3 text-lg font-semibold tracking-wide"
          id="screening-zip"
          inputMode="numeric"
          onChange={(event) => setZip(event.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
          value={zip}
        />
        <p className="mt-2 text-sm text-ink/75">
          {tScreening(language, "zipBasedOn", { zip: zip || "—", count: ranked.length })}
        </p>
        {!isKnownZip(zip) ? <p className="mt-1 text-xs text-note">{tScreening(language, "zipUnknown")}</p> : null}
      </div>

      {top ? (
        <div className="rounded-control border border-care bg-white p-4">
          <p className="text-sm font-medium text-care">{tScreening(language, "recommendedTitle")}</p>
          <p className="mt-1 text-lg font-semibold">
            {tScreening(language, "recommendationLine", {
              when: top.nextAvailable,
              site: top.name,
              miles: top.distanceMiles
            })}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink/75">{explainMatch(top, mode, language)}</p>
          {canBook ? (
            <button
              className="mt-3 flex min-h-14 w-full items-center justify-center rounded-control bg-care px-4 py-3 text-base font-semibold text-white hover:opacity-90"
              onClick={() => onBook(top)}
              type="button"
            >
              {tScreening(language, "bookIt")}
            </button>
          ) : null}
          <button
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-control border border-ink/15 px-4 py-2 text-sm font-semibold text-ink/80 hover:border-care"
            onClick={() => setShowAll((current) => !current)}
            type="button"
          >
            {tScreening(language, showAll ? "hideOtherOptions" : "seeOtherOptions")}
          </button>
        </div>
      ) : null}

      {showAll ? (
        <div className="space-y-3">
          {equity ? (
            <div className="rounded-control border border-note/40 bg-note/10 p-3 text-sm leading-6 text-ink">
              {tScreening(language, "equityNudge", { eyeMiles: equity.eyeMiles, cameraMiles: equity.cameraMiles })}
            </div>
          ) : null}

          <div className="flex gap-2" role="group" aria-label={tScreening(language, "seeOtherOptions")}>
            {MODES.map((candidate) => (
              <button
                key={candidate}
                className={
                  mode === candidate
                    ? "min-h-12 flex-1 rounded-control bg-care px-3 py-2 text-sm font-semibold text-white"
                    : "min-h-12 flex-1 rounded-control border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink/80"
                }
                onClick={() => setMode(candidate)}
                type="button"
              >
                {modeLabel[candidate]}
              </button>
            ))}
          </div>

          {ranked.map((site) => {
            const coverage = bestCoverageOptionForSite(SCREENING_COVERAGE_OPTIONS, site.id);
            const VenueIcon = VENUE_ICON[site.type];
            return (
              <article key={site.id} className="rounded-control border border-ink/10 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{site.name}</h3>
                  <span className="flex flex-none items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-ink/70">
                    <VenueIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    {venueLabel(site.type, language)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink/70">
                  <span className="flex items-center gap-1">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                    {site.distanceMiles} mi · {site.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                    {site.nextAvailable}
                  </span>
                  {site.rideSupport ? (
                    <span className="flex items-center gap-1">
                      <Car aria-hidden="true" className="h-3.5 w-3.5" />
                      {tScreening(language, "rideSupportBadge")}
                    </span>
                  ) : null}
                  {site.lowCost ? (
                    <span className="flex items-center gap-1">
                      <DollarSign aria-hidden="true" className="h-3.5 w-3.5" />
                      {tScreening(language, "lowCostBadge")}
                    </span>
                  ) : null}
                </div>
                {coverage ? (
                  <div className="mt-3 rounded-control border border-care/20 bg-calm p-3 text-xs leading-5 text-ink/80">
                    <p className="flex items-center gap-1 font-semibold text-care">
                      <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                      {tScreening(language, "coverageTitle")}
                    </p>
                    <p className="mt-1 font-medium text-ink">{coverage.payerLabel}</p>
                    <p>{tScreening(language, "coverageEstimated", { cost: coverage.estimatedCost })}</p>
                    {coverage.rideOption ? <p>{tScreening(language, "coverageRide", { ride: coverage.rideOption })}</p> : null}
                  </div>
                ) : null}
                {canBook ? (
                  <button
                    className="mt-3 flex min-h-12 w-full items-center justify-center rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
                    onClick={() => onBook(site)}
                    type="button"
                  >
                    {tScreening(language, "bookIt")} — {site.nextAvailable}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
