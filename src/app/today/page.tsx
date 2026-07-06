"use client";

import { AppShell } from "@/components/app-shell";
import { DoseCard } from "@/components/dose-card";
import { HomeComposer } from "@/components/home-composer";
import { TodayGreeting } from "@/components/today-greeting";
import { getAdherenceStreak, getDoseForDate, summarizeBpTrend, toDateKey } from "@/domain/adherence";
import { buildTodayTasks } from "@/domain/tasks";
import type { DoseEvent, MedicationBarrier } from "@/domain/types";
import { useHealthState } from "@/state/store";

export default function TodayPage() {
  const { state, dispatch } = useHealthState();
  const tasks = buildTodayTasks(state);
  const primaryMedication = state.medications[0];
  const now = new Date();
  const todayKey = toDateKey(now);
  const todayDose = primaryMedication
    ? getDoseForDate(state.doseEvents, primaryMedication.id, todayKey)
    : undefined;
  const streak = primaryMedication ? getAdherenceStreak(state.doseEvents, primaryMedication.id, now) : 0;
  const trend = summarizeBpTrend(state.readings);

  function recordDose(status: DoseEvent["status"], barrier: MedicationBarrier | null) {
    if (!primaryMedication) {
      return;
    }

    const event: DoseEvent = {
      id: crypto.randomUUID(),
      patientId: state.patient.id,
      medicationId: primaryMedication.id,
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
        <TodayGreeting patientName={state.patient.preferredName} tasks={tasks} />
        {state.patient.language === "en" ? <HomeComposer /> : null}
        {primaryMedication ? (
          <DoseCard
            medication={primaryMedication}
            todayDose={todayDose}
            streak={streak}
            trend={trend}
            onTake={() => recordDose("taken", null)}
            onSkip={(barrier) => recordDose("skipped", barrier)}
            onUndo={() => dispatch({ type: "undoDose", medicationId: primaryMedication.id, date: todayKey })}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
