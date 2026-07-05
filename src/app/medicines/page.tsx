"use client";

import { AppShell } from "@/components/app-shell";
import { MedicationCard } from "@/components/medication-card";
import { useHealthState } from "@/state/store";
import Link from "next/link";

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
        {state.medications.length === 0 ? (
          <section className="rounded-control border border-dashed border-ink/20 bg-white p-5">
            <h3 className="text-lg font-semibold">No medicines added yet</h3>
            <p className="mt-1 text-sm leading-6 text-ink/75">
              No medicines are listed right now, and that is okay. If you start a new medication, add the details from your team so we can help you understand it.
            </p>
            <Link className="mt-3 inline-flex rounded-control bg-care px-4 py-2 text-sm font-semibold text-white" href="/intake">
              Add medicines from your team
            </Link>
          </section>
        ) : (
          state.medications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              onBarriersChange={(barriers) =>
                dispatch({ type: "setMedicationBarriers", medicationId: medication.id, barriers })
              }
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
