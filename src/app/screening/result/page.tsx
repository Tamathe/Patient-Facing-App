"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ScreeningResultCapture } from "@/components/screening-result-capture";
import { ScreeningResultView } from "@/components/screening-result-view";
import { extractReportViaLiveRoute } from "@/ai/screening-extract-provider";
import type { DrReportExtraction, ResultCaptureSource } from "@/domain/types";
import { tScreening } from "@/i18n/strings";
import { useHealthState } from "@/state/store";

export default function ScreeningResultPage() {
  const { state, dispatch } = useHealthState();
  const router = useRouter();
  const language = state.patient.language;

  const scheduledGap = state.screeningGaps.find((gap) => gap.status === "scheduled");
  const latestResult = state.screeningResults.at(-1);

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
        <ScreeningResultView language={language} result={latestResult} />
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
