"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ScreeningJourney } from "@/components/screening-journey";
import { screeningLens, screeningLensHref, screeningLensLine } from "@/domain/screening-status";
import { tScreening } from "@/i18n/strings";
import { useHealthState } from "@/state/store";

export default function PlanPage() {
  const { state } = useHealthState();
  const confirmedFacts = state.extractedFacts.filter((fact) => fact.status === "confirmed");
  const needsReviewFacts = state.extractedFacts.filter((fact) => fact.status === "needs_review");
  const eyeLens = screeningLens(state, new Date());
  const eyeLensHref = eyeLens ? screeningLensHref(eyeLens) : null;
  const latestResult = state.screeningResults.at(-1);
  const latestReferral = latestResult
    ? state.referrals.find((referral) => referral.resultId === latestResult.id)
    : undefined;

  return (
    <AppShell title="My Plan">
      <div className="grid gap-5">
        <section className="rounded-control border border-care/20 bg-calm p-4">
          <h2 className="text-xl font-semibold">What you are managing</h2>
          <p className="mt-2 text-sm leading-6">{state.carePlan.plainLanguageSummary}</p>
        </section>
        {eyeLens ? (
          <section className="rounded-control border border-ink/10 bg-white p-4">
            <h2 className="text-lg font-semibold">{tScreening(state.patient.language, "lensTitle")}</h2>
            <p className="mt-2 text-sm leading-6">{screeningLensLine(eyeLens, state.patient.language)}</p>
            {eyeLensHref ? (
              <Link
                className="mt-3 inline-flex min-h-12 items-center rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
                href={eyeLensHref}
              >
                {tScreening(state.patient.language, "pageTitle")}
              </Link>
            ) : null}
          </section>
        ) : null}
        {latestResult ? (
          <ScreeningJourney language={state.patient.language} referral={latestReferral} result={latestResult} />
        ) : null}
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Daily home actions</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            {state.carePlan.dailyActions.map((action) => (
              <li key={action}>- {action}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Confirmed instructions</h2>
          {confirmedFacts.length === 0 ? <p className="mt-2 text-sm text-ink/70">Confirmed instructions will appear here after review.</p> : null}
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            {confirmedFacts.map((fact) => (
              <li key={fact.id}>- {fact.value}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Instructions to confirm</h2>
          {needsReviewFacts.length === 0 ? (
            <p className="mt-2 text-sm text-ink/70">All extracted instructions are reviewed or there are no pending instructions.</p>
          ) : (
            <ul className="mt-3 grid gap-2 text-sm leading-6">
              {needsReviewFacts.map((fact) => (
                <li key={fact.id}>- {fact.value}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
