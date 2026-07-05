"use client";

import type { Medication, MedicationBarrier } from "@/domain/types";
import React from "react";

const barrierOptions: Array<{ value: MedicationBarrier; label: string }> = [
  { value: "forgot", label: "I forgot" },
  { value: "ran_out", label: "I ran out" },
  { value: "cost", label: "It costs too much" },
  { value: "side_effects", label: "I feel side effects" },
  { value: "confused", label: "I am confused" },
  { value: "scared", label: "I am scared" },
  { value: "pharmacy_issue", label: "The pharmacy has an issue" },
  { value: "does_not_feel_necessary", label: "It does not feel necessary" }
];

const evidenceCopy: Record<Medication["source"], string> = {
  confirmed: "This came from your care plan and was confirmed by your clinician.",
  patient_reported: "You shared this information. If it changed, tell your care team and we can update it.",
  imported: "This was imported from your records and may need a quick check if things changed.",
  inferred: "This is based on related information and should be confirmed with your clinician.",
  needs_review: "This needs a quick check with your clinician before treating it as final."
};

const sourceLabel: Record<Medication["source"], string> = {
  confirmed: "Care-Plan Confirmed",
  patient_reported: "You Shared",
  imported: "Imported",
  inferred: "Likely / Inferred",
  needs_review: "Needs Review"
};

type MedicationCardProps = {
  medication: Medication;
  onBarriersChange: (barriers: MedicationBarrier[]) => void;
};

export function MedicationCard({ medication, onBarriersChange }: MedicationCardProps) {
  function toggleBarrier(value: MedicationBarrier) {
    const next = medication.activeBarriers.includes(value)
      ? medication.activeBarriers.filter((barrier) => barrier !== value)
      : [...medication.activeBarriers, value];

    onBarriersChange(next);
  }

  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{medication.name}</h2>
          <p className="text-sm text-ink/65">{medication.dose} - {medication.schedule}</p>
        </div>
        <span className="rounded-control bg-calm px-2 py-1 text-xs font-semibold text-care">
          {sourceLabel[medication.source]}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm leading-6">
        <p><strong>Why:</strong> {medication.purpose}</p>
        <p><strong>What it helps prevent:</strong> {medication.preventionBenefit}</p>
        <p><strong>Safety note:</strong> {medication.safetyNote}</p>
        <p className="text-xs leading-5 text-ink/75">
          <strong>How we know this:</strong> {evidenceCopy[medication.source]}
        </p>
      </div>
      <fieldset className="mt-4">
        <legend className="font-semibold">I am not taking this because...</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {barrierOptions.map((option) => (
            <label key={option.value} className="rounded-control border border-ink/15 px-3 py-2 text-sm">
              <input
                checked={medication.activeBarriers.includes(option.value)}
                className="mr-2"
                onChange={() => toggleBarrier(option.value)}
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </article>
  );
}
