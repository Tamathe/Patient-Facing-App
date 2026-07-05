"use client";

import React from "react";
import { t, type Language } from "@/i18n/strings";
import type { MealLogEntry } from "@/domain/types";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function MealLogList({ entries, language }: { entries: MealLogEntry[]; language: Language }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{t(language, "recentMealsTitle")}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-ink/65">{t(language, "noMealsYet")}</p>
      ) : (
        <ul className="grid gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-control border border-ink/10 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{entry.food.brand ? `${entry.food.brand} ${entry.food.name}` : entry.food.name}</p>
                <span className="text-xs text-ink/60">{formatTime(entry.loggedAt)}</span>
              </div>
              {entry.flags[0] ? <p className="mt-1 text-sm text-ink/70">{entry.flags[0]}</p> : null}
              {entry.assistantSummary ? <p className="mt-1 text-sm text-ink/60">{entry.assistantSummary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
