"use client";

import React from "react";
import { t, type Language } from "@/i18n/strings";
import type { FoodFlag, FoodFlagSeverity } from "@/domain/food-flags";
import type { IdentifiedFood } from "@/domain/types";

const severityClass: Record<FoodFlagSeverity, string> = {
  warning: "bg-pulse/10 text-pulse",
  caution: "bg-amber-100 text-amber-800",
  info: "bg-calm text-care"
};

export function FoodFactsCard({
  food,
  flags,
  logged,
  canLog,
  onLog,
  language
}: {
  food: IdentifiedFood | null;
  flags: FoodFlag[];
  logged: boolean;
  canLog: boolean;
  onLog: () => void;
  language: Language;
}) {
  const title = food ? (food.brand ? `${food.brand} ${food.name}` : food.name) : t(language, "unknownFood");

  return (
    <section className="rounded-control border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {food?.nutrition ? <p className="text-sm text-ink/65">{food.nutrition.servingSize}</p> : null}
        </div>
        {food && food.source === "vision_estimate" ? (
          <span className="rounded-control bg-calm px-2 py-1 text-xs font-semibold text-care">{t(language, "visionEstimateBadge")}</span>
        ) : null}
      </div>

      {flags.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {flags.map((flag) => (
            <li key={flag.id} className={`rounded-control px-3 py-2 text-sm font-medium ${severityClass[flag.severity]}`}>
              {flag.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        {logged ? (
          <p className="text-sm font-semibold text-care">{t(language, "loggedConfirmation")}</p>
        ) : (
          <button
            className="min-h-14 w-full rounded-control bg-care px-4 py-2 font-semibold text-white disabled:opacity-40"
            disabled={!canLog}
            onClick={onLog}
            type="button"
          >
            {t(language, "logThis")}
          </button>
        )}
      </div>
    </section>
  );
}
