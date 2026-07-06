"use client";

import { AppShell } from "@/components/app-shell";
import { DoseCard } from "@/components/dose-card";
import { HomeComposer } from "@/components/home-composer";
import { TodayGreeting } from "@/components/today-greeting";
import {
  getAdherenceStreak,
  getDoseForDate,
  summarizeBpTrend,
  summarizeGlucoseTrend,
  toDateKey,
  type TrendSummary
} from "@/domain/adherence";
import { isDiabetesMedication, pickFeaturedMedication } from "@/domain/featured-medication";
import { buildTodayTasks } from "@/domain/tasks";
import type { DoseEvent, MedicationBarrier } from "@/domain/types";
import { useHealthState } from "@/state/store";

export default function TodayPage() {
  const { state, dispatch } = useHealthState();
  const tasks = buildTodayTasks(state);
  const featuredMedication = pickFeaturedMedication(state);
  const featuredIsDiabetes = featuredMedication ? isDiabetesMedication(featuredMedication) : false;
  const now = new Date();
  const todayKey = toDateKey(now);
  const todayDose = featuredMedication
    ? getDoseForDate(state.doseEvents, featuredMedication.id, todayKey)
    : undefined;
  const streak = featuredMedication ? getAdherenceStreak(state.doseEvents, featuredMedication.id, now) : 0;
  // The featured medicine's own domain trend: blood sugar for a diabetes medicine,
  // blood pressure otherwise. When the card already shows glucose we do not repeat
  // it in the standalone panel below.
  const featuredTrend: TrendSummary | null = featuredIsDiabetes
    ? summarizeGlucoseTrend(state.glucoseReadings)
    : summarizeBpTrend(state.readings);
  const standaloneGlucoseTrend = featuredIsDiabetes ? null : summarizeGlucoseTrend(state.glucoseReadings);

  function recordDose(status: DoseEvent["status"], barrier: MedicationBarrier | null) {
    if (!featuredMedication) {
      return;
    }

    const event: DoseEvent = {
      id: crypto.randomUUID(),
      patientId: state.patient.id,
      medicationId: featuredMedication.id,
      date: todayKey,
      status,
      barrier,
      recordedAt: new Date().toISOString()
    };
    dispatch({ type: "logDose", event });
  }

  return (
    <AppShell title="Today">
      <div className="space-y-4">
        <TodayGreeting patientName={state.patient.preferredName} tasks={tasks} language={state.patient.language} />
        <HomeComposer />
        {featuredMedication ? (
          <DoseCard
            medication={featuredMedication}
            todayDose={todayDose}
            streak={streak}
            trend={featuredTrend}
            onTake={() => recordDose("taken", null)}
            onSkip={(barrier) => recordDose("skipped", barrier)}
            onUndo={() => dispatch({ type: "undoDose", medicationId: featuredMedication.id, date: todayKey })}
          />
        ) : null}
        {standaloneGlucoseTrend ? (
          <section className="rounded-control border border-ink/10 bg-white p-4">
            <p className="text-sm font-medium text-care">Your blood sugar</p>
            <p className="mt-1 text-sm leading-6 text-ink/80">{standaloneGlucoseTrend.message}</p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
