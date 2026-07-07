"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Copy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReferralPacketView } from "@/components/referral-packet-view";
import { ReferralStatusCard } from "@/components/referral-status-card";
import { ScreeningResultCapture } from "@/components/screening-result-capture";
import { ScreeningResultView } from "@/components/screening-result-view";
import { extractReportViaLiveRoute } from "@/ai/screening-extract-provider";
import { buildReferralCareTeamMessage } from "@/domain/care-team-message";
import { getDestinationById } from "@/domain/screening-sites";
import type { AppState, DrReportExtraction, Referral, ResultCaptureSource, ScreeningResult } from "@/domain/types";
import { tScreening, type Language } from "@/i18n/strings";
import { useHealthState } from "@/state/store";

function CareTeamDraftCard({ language, message }: { language: Language; message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="rounded-control border border-ink/10 bg-white p-4">
      <h3 className="font-semibold">{tScreening(language, "careTeamDraftTitle")}</h3>
      <p className="mt-1 text-xs text-ink/60">{tScreening(language, "careTeamDraftHint")}</p>
      <pre className="mt-3 whitespace-pre-wrap rounded-control bg-paper p-3 text-sm leading-6 text-ink">{message}</pre>
      <button
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care"
        onClick={() => {
          void navigator.clipboard?.writeText(message).catch(() => undefined);
          setCopied(true);
        }}
        type="button"
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
        {copied ? (language === "es" ? "Copiado" : "Copied") : language === "es" ? "Copiar mensaje" : "Copy message"}
      </button>
    </section>
  );
}

function ReferralSection({
  state,
  result,
  referral,
  language
}: {
  state: AppState;
  result: ScreeningResult;
  referral: Referral;
  language: Language;
}) {
  const [packetOpen, setPacketOpen] = useState(false);
  const destination = getDestinationById(referral.destinationId);
  if (!destination) {
    return null;
  }
  const gap = state.screeningGaps.find((candidate) => candidate.id === result.gapId);

  return (
    <div className="space-y-4">
      {referral.tier === "retina_urgent" ? (
        <section className="rounded-control border border-pulse bg-pulse/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-pulse">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            {tScreening(language, "urgentBannerTitle")}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink">{tScreening(language, "urgentBannerBody")}</p>
        </section>
      ) : null}

      <ReferralStatusCard destination={destination} language={language} referral={referral} />

      {referral.tier === "retina_urgent" ? (
        <CareTeamDraftCard
          language={language}
          message={buildReferralCareTeamMessage(state, {
            destinationName: destination.name,
            tier: referral.tier,
            sentAt: referral.sentAt,
            reason: "urgent"
          })}
        />
      ) : null}

      {packetOpen ? (
        <ReferralPacketView
          destination={destination}
          gap={gap}
          language={language}
          patientName={state.patient.name}
          referral={referral}
          result={result}
        />
      ) : (
        <button
          className="flex min-h-12 w-full items-center justify-center rounded-control border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink/80 hover:border-care"
          onClick={() => setPacketOpen(true)}
          type="button"
        >
          {tScreening(language, "packetOpen")}
        </button>
      )}
    </div>
  );
}

export default function ScreeningResultPage() {
  const { state, dispatch } = useHealthState();
  const router = useRouter();
  const language = state.patient.language;

  const scheduledGap = state.screeningGaps.find((gap) => gap.status === "scheduled");
  const latestResult = state.screeningResults.at(-1);
  const referral = latestResult ? state.referrals.find((candidate) => candidate.resultId === latestResult.id) : undefined;

  function confirmExtraction(extraction: DrReportExtraction, source: ResultCaptureSource, reportRef: string) {
    dispatch({ type: "screeningResultConfirmed", extraction, source, reportRef });
  }

  return (
    <AppShell title={tScreening(language, "resultPageTitle")}>
      {scheduledGap ? (
        <ScreeningResultCapture
          language={language}
          liveExtract={(file) => {
            const passcode =
              typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("k") ?? undefined : undefined;
            return extractReportViaLiveRoute(file, state.patient.id, passcode);
          }}
          onConfirm={confirmExtraction}
          onSafetyIntercept={(text) => router.push(`/chat?ask=${encodeURIComponent(text)}`)}
        />
      ) : latestResult ? (
        <ScreeningResultView language={language} result={latestResult}>
          {referral ? <ReferralSection language={language} referral={referral} result={latestResult} state={state} /> : null}
        </ScreeningResultView>
      ) : (
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <p className="text-sm leading-6 text-ink/80">{tScreening(language, "resultNeedBooking")}</p>
          <Link
            className="mt-3 inline-flex min-h-12 items-center rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
            href="/screening"
          >
            {tScreening(language, "resultNeedBookingCta")}
          </Link>
        </section>
      )}
    </AppShell>
  );
}
