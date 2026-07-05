"use client";

import { AppShell } from "@/components/app-shell";
import { MedicationCard } from "@/components/medication-card";
import { useHealthState } from "@/state/store";

export default function MedicinesPage() {
  const { state, dispatch } = useHealthState();

  return (
    <AppShell title="My Medicines">
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">Understand what you take</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            These cards explain why each medicine matters and capture what gets in the way without blame.
          </p>
        </section>
        {state.medications.map((medication) => (
          <MedicationCard
            key={medication.id}
            medication={medication}
            onBarriersChange={(barriers) =>
              dispatch({ type: "setMedicationBarriers", medicationId: medication.id, barriers })
            }
          />
        ))}
      </div>
    </AppShell>
  );
}
