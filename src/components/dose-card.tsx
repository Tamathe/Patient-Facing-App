"use client";

import Link from "next/link";
import React, { useState } from "react";
import { MIN_TREND_READINGS, type TrendSummary } from "@/domain/adherence";
import { buildBarrierSupport } from "@/domain/adherence-support";
import { barrierLabel } from "@/domain/labels";
import type { DoseEvent, Medication, MedicationBarrier } from "@/domain/types";

const skipBarriers: MedicationBarrier[] = [
  "forgot",
  "side_effects",
  "does_not_feel_necessary",
  "ran_out",
  "cost",
  "confused",
  "scared",
  "pharmacy_issue"
];

type DoseCardProps = {
  medication: Medication;
  todayDose: DoseEvent | undefined;
  streak: number;
  rate: { taken: number; of: number };
  readingCount: number;
  trend: TrendSummary | null;
  onTake: () => void;
  onSkip: (barrier: MedicationBarrier) => void;
  onUndo: () => void;
};

export function DoseCard({ medication, todayDose, streak, rate, readingCount, trend, onTake, onSkip, onUndo }: DoseCardProps) {
  const [showSkip, setShowSkip] = useState(false);
  const barrierSupport = todayDose?.status === "skipped" && todayDose.barrier
    ? buildBarrierSupport(medication, todayDose.barrier)
    : null;
  const readingsRemaining = Math.max(0, MIN_TREND_READINGS - readingCount);

  const streakLine =
    streak > 0
      ? `${streak}-day streak of taking it. Keep it going.`
      : "Mark today to start your streak.";

  return (
    <section className="rounded-control border border-care/30 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-care">Today&apos;s medicine</p>
          <h2 className="mt-1 text-xl font-semibold">{medication.name}</h2>
          <p className="text-sm text-ink/70">
            {medication.dose} - {medication.schedule}
          </p>
        </div>
      </div>

      {todayDose === undefined ? (
        <div className="mt-4">
          <p className="text-base font-medium">Have you taken it today?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="min-h-12 rounded-control bg-care px-5 py-3 text-base font-semibold text-white"
              onClick={onTake}
              type="button"
            >
              I took it
            </button>
            <button
              className="min-h-12 rounded-control border border-ink/20 px-5 py-3 text-base font-semibold"
              onClick={() => setShowSkip((open) => !open)}
              type="button"
            >
              I skipped it
            </button>
          </div>
          {showSkip ? (
            <fieldset className="mt-4">
              <legend className="text-sm font-medium">What got in the way? (no blame)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {skipBarriers.map((barrier) => (
                  <button
                    className="min-h-12 rounded-control border border-ink/15 px-3 py-3 text-left text-sm font-medium hover:border-care"
                    key={barrier}
                    onClick={() => {
                      onSkip(barrier);
                      setShowSkip(false);
                    }}
                    type="button"
                  >
                    {barrierLabel(barrier)}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : todayDose.status === "taken" ? (
        <div className="mt-4">
          <p className="text-base font-semibold text-care">Taken today. Nice work.</p>
          <button className="mt-2 text-sm font-medium text-ink/70 underline" onClick={onUndo} type="button">
            Undo
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-base font-semibold">
            Marked skipped{todayDose.barrier ? ` - ${barrierLabel(todayDose.barrier)}` : ""}.
          </p>
          <p className="mt-1 text-sm text-ink/75">
            That is okay to say. When you are ready, we can turn it into a question for your care team.
          </p>
          {barrierSupport?.reassurance ? (
            <p className="mt-2 rounded-control bg-calm p-3 text-sm leading-6 text-ink/80">
              {barrierSupport.reassurance}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium">
            <Link className="text-care underline" href={barrierSupport?.href ?? "/chat"}>
              {barrierSupport?.linkLabel ?? "Get help with this"}
            </Link>
            <button className="text-ink/70 underline" onClick={onUndo} type="button">
              Undo
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm font-medium text-ink/80">{streakLine}</p>
      <p className="mt-1 text-sm text-ink/75">Taken {rate.taken} of the last {rate.of} days.</p>

      {trend ? (
        <p className="mt-2 rounded-control bg-calm p-3 text-sm leading-6 text-ink/80">
          <strong className="font-semibold">Is it working? </strong>
          {trend.message}
        </p>
      ) : readingsRemaining > 0 ? (
        <p className="mt-2 rounded-control bg-calm p-3 text-sm leading-6 text-ink/80">
          Log {readingsRemaining} more {readingsRemaining === 1 ? "reading" : "readings"} to see a pattern.
        </p>
      ) : null}
    </section>
  );
}
