"use client";

import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { buildRefillGapDraft, getPdcToDate } from "@/domain/medication-fills";
import { classifyDiabetesMedication } from "@/domain/pdc-adherence";
import type { AppState, MedicationFill } from "@/domain/types";

type PdcCardProps = {
  state: AppState;
  today?: Date;
  onLogFill: (fill: MedicationFill) => void;
};

export function PdcCard({ state, today = new Date(), onLogFill }: PdcCardProps) {
  const result = getPdcToDate(state, today);
  const classifiableMeds = state.medications.filter(
    (medication) => classifyDiabetesMedication(medication.name).status === "included"
  );
  const [medicationId, setMedicationId] = useState(classifiableMeds[0]?.id ?? "");
  const [dateOfService, setDateOfService] = useState("");
  const [daysSupply, setDaysSupply] = useState("30");
  const [shared, setShared] = useState(false);

  if (!result) {
    return null;
  }

  const draft = result.eligible ? buildRefillGapDraft(state, result) : null;
  const insulinExcluded = result.exclusionClaims.length > 0;

  async function shareDraft(text: string) {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "For my care team", text });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
    } catch {
      // sharing is best-effort; nothing leaves the device unless the patient confirms
    }
  }

  function submitFill(event: React.FormEvent) {
    event.preventDefault();
    const medication = state.medications.find((item) => item.id === medicationId);
    const supply = Number.parseInt(daysSupply, 10);
    if (!medication || dateOfService.length === 0 || !Number.isFinite(supply) || supply <= 0) {
      return;
    }
    onLogFill({
      id: crypto.randomUUID(),
      patientId: state.patient.id,
      medicationId: medication.id,
      medicationName: medication.name,
      dateOfService,
      daysSupply: supply,
      source: "patient_reported"
    });
    setDateOfService("");
    setDaysSupply("30");
  }

  return (
    <section className="rounded-control border border-ink/10 bg-white p-5">
      <h3 className="text-lg font-semibold">Diabetes medicine coverage</h3>

      {insulinExcluded ? (
        <p className="mt-2 text-sm leading-6 text-ink/75">
          Your insulin is not scored by this estimate. Coverage for insulin is best reviewed with your care team.
        </p>
      ) : !result.eligible ? (
        <p className="mt-2 text-sm leading-6 text-ink/75">
          Not enough refill history yet to estimate coverage. Log a couple of refills over time and this will fill in.
        </p>
      ) : (
        <div className="mt-2 grid gap-2">
          <p className="text-3xl font-semibold">{result.pdcPercent}%</p>
          <p className="text-sm leading-6 text-ink/75">
            Estimated share of days covered so far this year. The goal line is {result.thresholdPercent}%.
          </p>
          {draft ? (
            <div className="mt-2 grid gap-2">
              <p className="text-sm leading-6 text-ink/75">
                This is below the goal line — refills or cost may be getting in the way. You can send your care team a
                message about it.
              </p>
              <button
                className="inline-flex min-h-12 w-fit items-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care"
                onClick={() => void shareDraft(draft.draft)}
                type="button"
              >
                <Share2 aria-hidden="true" className="h-4 w-4" />
                Draft a refill message
              </button>
              {shared ? (
                <p className="text-xs text-ink/60">Draft ready — check your share sheet or clipboard.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <p className="mt-3 text-xs text-ink/60">
        This is an estimate from refills you logged — not a pharmacy-claims measure.
      </p>

      {classifiableMeds.length > 0 ? (
        <form className="mt-4 grid gap-3 border-t border-ink/10 pt-4" onSubmit={submitFill}>
          <p className="text-sm font-medium">Log a refill</p>
          <label className="grid gap-1 text-sm">
            Medicine
            <select
              className="min-h-12 rounded-control border border-ink/20 px-3 py-2"
              onChange={(event) => setMedicationId(event.target.value)}
              value={medicationId}
            >
              {classifiableMeds.map((medication) => (
                <option key={medication.id} value={medication.id}>
                  {medication.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Date picked up
            <input
              className="min-h-12 rounded-control border border-ink/20 px-3 py-2"
              onChange={(event) => setDateOfService(event.target.value)}
              type="date"
              value={dateOfService}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Days supply
            <input
              className="min-h-12 rounded-control border border-ink/20 px-3 py-2"
              min={1}
              onChange={(event) => setDaysSupply(event.target.value)}
              type="number"
              value={daysSupply}
            />
          </label>
          <button
            className="inline-flex min-h-12 w-fit items-center rounded-control bg-care px-4 py-2 text-sm font-semibold text-white"
            type="submit"
          >
            Log refill
          </button>
        </form>
      ) : null}
    </section>
  );
}
