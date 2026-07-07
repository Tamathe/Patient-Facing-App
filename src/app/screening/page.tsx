"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ScreeningBooked } from "@/components/screening-booked";
import { ScreeningFind } from "@/components/screening-find";
import { ScreeningNudge } from "@/components/screening-nudge";
import { recordAuditEvent } from "@/domain/audit";
import { buildScreeningCallbackMessage } from "@/domain/care-team-message";
import type { SiteWithDistance } from "@/domain/ky-geo";
import { renderNudge } from "@/domain/nudge-template";
import { getSiteById, monthsSince } from "@/domain/screening-sites";
import type { KentuckySdohResource } from "@/domain/sdoh-resources";
import { tScreening } from "@/i18n/strings";
import { useHealthState } from "@/state/store";

const DEFAULT_ZIP = "41701";

function ScreeningPageInner() {
  const { state, dispatch } = useHealthState();
  const searchParams = useSearchParams();
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const language = state.patient.language;
  const scheduledGap = state.screeningGaps.find((gap) => gap.status === "scheduled");
  const bookableGap = state.screeningGaps.find(
    (gap) => gap.status === "overdue" || gap.status === "engaged" || gap.status === "repeat"
  );

  const months = bookableGap?.lastScreeningDate ? monthsSince(bookableGap.lastScreeningDate, new Date()) : null;
  const nudge =
    searchParams.get("entry") === "sms" && bookableGap && months !== null && !nudgeDismissed
      ? renderNudge({
          templateId: "screening_nudge_v1",
          language,
          slots: { firstName: state.patient.preferredName, months: String(months) }
        })
      : null;

  function bookSite(site: SiteWithDistance) {
    if (!bookableGap) {
      return;
    }
    dispatch({
      type: "bookScreening",
      gapId: bookableGap.id,
      siteId: site.id,
      siteName: site.name,
      when: site.nextAvailable
    });
  }

  function shareReferral(resource: KentuckySdohResource) {
    dispatch({
      type: "addAuditEvent",
      event: recordAuditEvent(state.patient.id, "shared", `Shared referral: ${resource.name}`)
    });
  }

  if (scheduledGap) {
    const site = scheduledGap.scheduledSiteId ? getSiteById(scheduledGap.scheduledSiteId) : undefined;
    return (
      <ScreeningBooked
        county={state.patient.county ?? "Perry"}
        language={language}
        onShareReferral={shareReferral}
        rideSupport={site?.rideSupport ?? false}
        siteName={site?.name ?? scheduledGap.scheduledSiteId ?? ""}
        when={scheduledGap.scheduledFor ?? ""}
      />
    );
  }

  if (nudge?.ok) {
    return (
      <ScreeningNudge
        callbackMessage={buildScreeningCallbackMessage(state, months)}
        language={language}
        nudgeMessage={nudge.message}
        onSeeTimes={() => setNudgeDismissed(true)}
      />
    );
  }

  if (!bookableGap) {
    return (
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <p className="text-sm leading-6 text-ink/80">{tScreening(language, "allCaughtUp")}</p>
        {state.screeningResults.length > 0 ? (
          <Link
            className="mt-3 inline-flex min-h-12 items-center rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
            href="/screening/result"
          >
            {tScreening(language, "seeLatestResult")}
          </Link>
        ) : null}
      </section>
    );
  }

  return <ScreeningFind canBook initialZip={DEFAULT_ZIP} language={language} onBook={bookSite} />;
}

export default function ScreeningPage() {
  return (
    <ScreeningShell>
      <Suspense fallback={null}>
        <ScreeningPageInner />
      </Suspense>
    </ScreeningShell>
  );
}

function ScreeningShell({ children }: { children: React.ReactNode }) {
  const { state } = useHealthState();
  return <AppShell title={tScreening(state.patient.language, "pageTitle")}>{children}</AppShell>;
}
