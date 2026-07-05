"use client";

import { AppShell } from "@/components/app-shell";
import { useHealthState } from "@/state/store";

export default function PlanPage() {
  const { state } = useHealthState();
  const confirmedFacts = state.extractedFacts.filter((fact) => fact.status === "confirmed");

  return (
    <AppShell title="My Plan">
      <div className="grid gap-5">
        <section className="rounded-control border border-care/20 bg-calm p-4">
          <h2 className="text-xl font-semibold">What you are managing</h2>
          <p className="mt-2 text-sm leading-6">{state.carePlan.plainLanguageSummary}</p>
        </section>
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
      </div>
    </AppShell>
  );
}
