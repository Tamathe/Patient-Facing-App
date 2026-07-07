"use client";

import { AppShell } from "@/components/app-shell";
import { GlucoseInsights } from "@/components/glucose-insights";
import { GlucoseLogForm } from "@/components/glucose-log-form";
import { interpretGlucose } from "@/domain/blood-glucose";
import { summarizeGlucoseTrend } from "@/domain/adherence";
import { activeConditions, selectLenses } from "@/domain/condition-lens";
import { summarizeFoodGlucoseLink } from "@/domain/glucose-correlation";
import { computeTimeInRange } from "@/domain/glucose-range";
import type { GlucoseReading } from "@/domain/types";
import { useHealthState } from "@/state/store";

export default function GlucosePage() {
  const { state, dispatch } = useHealthState();
  const latest = state.glucoseReadings.at(-1);
  const insight = latest ? interpretGlucose(latest, state.glucoseReadings.slice(0, -1), state.carePlan) : null;
  const trend = summarizeGlucoseTrend(state.glucoseReadings);
  const timeInRange = computeTimeInRange(state.glucoseReadings);
  const foodInsight = summarizeFoodGlucoseLink(
    state.mealLog,
    state.glucoseReadings,
    selectLenses(activeConditions(state.carePlan))
  );

  return (
    <AppShell title="My Blood Sugar">
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">Log blood sugar</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            Use the number from your meter. The app helps you notice patterns and prepare for visits.
          </p>
        </section>
        <GlucoseLogForm
          onSubmit={(values) => {
            const reading: GlucoseReading = {
              id: crypto.randomUUID(),
              patientId: state.patient.id,
              valueMgDl: values.valueMgDl,
              measuredAt: new Date().toISOString(),
              contexts: values.contexts,
              note: values.note
            };
            dispatch({ type: "addGlucoseReading", reading });
          }}
        />
        {insight ? (
          <section className="rounded-control border border-care/30 bg-calm p-4">
            <h2 className="text-lg font-semibold">
              Latest insight {insight.source === "care_plan" ? "from your care plan" : "from health education"}
            </h2>
            <p className="mt-2 text-sm leading-6">{insight.message}</p>
          </section>
        ) : null}
        {trend ? (
          <section className="rounded-control border border-ink/10 bg-white p-4">
            <h2 className="text-lg font-semibold">Your trend</h2>
            <p className="mt-2 text-sm leading-6">{trend.message}</p>
          </section>
        ) : null}
        <GlucoseInsights timeInRange={timeInRange} foodInsight={foodInsight} />
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Recent readings</h2>
          {state.glucoseReadings.slice(-5).reverse().map((reading) => (
            <div key={reading.id} className="rounded-control border border-ink/10 bg-white p-3 text-sm">
              <strong>{reading.valueMgDl} mg/dL</strong>
              <p className="text-ink/65">{new Date(reading.measuredAt).toLocaleString()}</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
