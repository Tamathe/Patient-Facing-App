"use client";

import React from "react";
import { AppShell } from "@/components/app-shell";
import { QuickCheck } from "@/components/quick-check";
import { useHealthState } from "@/state/store";

export default function QuickCheckPage() {
  const { state } = useHealthState();
  return (
    <AppShell title={state.patient.language === "es" ? "El chequeo de 2 minutos" : "The 2-minute check"}>
      <QuickCheck />
    </AppShell>
  );
}
