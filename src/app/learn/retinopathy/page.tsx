"use client";

import { AppShell } from "@/components/app-shell";
import { RetinopathyLearn } from "@/components/retinopathy-learn";
import { useHealthState } from "@/state/store";

export default function LearnRetinopathyPage() {
  const { state } = useHealthState();
  const title = state.patient.language === "es" ? "Aprender: retinopatía diabética" : "Learn: diabetic retinopathy";

  return (
    <AppShell title={title}>
      <RetinopathyLearn language={state.patient.language} />
    </AppShell>
  );
}
