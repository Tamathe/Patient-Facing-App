"use client";

import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
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
import { activeConditions } from "@/domain/condition-lens";
import { isDiabetesMedication, pickFeaturedMedication } from "@/domain/featured-medication";
import { monthsSince } from "@/domain/screening-sites";
import { buildTodayTasks } from "@/domain/tasks";
import type { DoseEvent, MedicationBarrier } from "@/domain/types";
import { tScreening } from "@/i18n/strings";
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
  // The eye-check tile follows the glucose-tile idiom: it appears only when a
  // diabetes condition and an overdue screening gap coexist.
  const hasDiabetes = activeConditions(state.carePlan).includes("diabetes");
  const overdueScreening = hasDiabetes ? state.screeningGaps.find((gap) => gap.status === "overdue") : undefined;
  const overdueMonths = overdueScreening?.lastScreeningDate
    ? monthsSince(overdueScreening.lastScreeningDate, now)
    : null;

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
        {overdueScreening ? (
          <section className="rounded-control border border-care/30 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-care">
              <Eye aria-hidden="true" className="h-4 w-4" />
              {tScreening(state.patient.language, "tileEyeCheckTitle")}
            </p>
            <p className="mt-1 text-sm leading-6 text-ink/80">
              {tScreening(state.patient.language, "tileEyeCheckBody", { months: overdueMonths ?? 12 })}
            </p>
            <Link
              className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care hover:bg-calm"
              href="/screening?entry=sms"
            >
              {tScreening(state.patient.language, "tileEyeCheckCta")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
