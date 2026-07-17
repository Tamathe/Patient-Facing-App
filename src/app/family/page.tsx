"use client";

import React from "react";
import { AppShell } from "@/components/app-shell";
import { tFamily } from "@/i18n/family-strings";
import { useHealthState } from "@/state/store";

export default function FamilyPage() {
  const { state } = useHealthState();
  const language = state.patient.language;

  return (
    <AppShell title={tFamily(language, "pageTitle")}>
      <section className="rounded-control border border-care/20 bg-white p-4">
        <p className="inline-flex rounded-full bg-calm px-3 py-1 text-xs font-semibold text-care">
          {tFamily(language, "demoBadge")}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink/75">{tFamily(language, "intro")}</p>
      </section>
    </AppShell>
  );
}
