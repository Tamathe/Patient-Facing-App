"use client";

import { BpLogForm } from "@/components/bp-log-form";
import { AppShell } from "@/components/app-shell";
import { interpretBloodPressure } from "@/domain/blood-pressure";
import type { HomeReading } from "@/domain/types";
import { useHealthState } from "@/state/store";

export default function NumbersPage() {
  const { state, dispatch } = useHealthState();
  const latest = state.readings.at(-1);
  const insight = latest ? interpretBloodPressure(latest, state.readings.slice(0, -1), state.carePlan) : null;

  return (
    <AppShell title="My Numbers">
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">Log blood pressure</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            Use the numbers from your cuff. The app helps you notice patterns and prepare for visits.
          </p>
        </section>
        <BpLogForm
          onSubmit={(values) => {
            const reading: HomeReading = {
              id: crypto.randomUUID(),
              patientId: state.patient.id,
              systolic: values.systolic,
              diastolic: values.diastolic,
              pulse: values.pulse,
              measuredAt: new Date().toISOString(),
              contexts: values.contexts,
              note: values.note
            };
            dispatch({ type: "addReading", reading });
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
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Recent readings</h2>
          {state.readings.slice(-5).reverse().map((reading) => (
            <div key={reading.id} className="rounded-control border border-ink/10 bg-white p-3 text-sm">
              <strong>
                {reading.systolic}/{reading.diastolic}
              </strong>
              {reading.pulse ? <span> pulse {reading.pulse}</span> : null}
              <p className="text-ink/65">{new Date(reading.measuredAt).toLocaleString()}</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
