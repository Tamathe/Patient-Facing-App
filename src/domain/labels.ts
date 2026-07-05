import type { EvidenceStatus, MedicationBarrier } from "./types";

const barrierLabels: Record<MedicationBarrier, string> = {
  forgot: "Forgot a dose",
  ran_out: "Ran out",
  cost: "Cost is hard",
  side_effects: "Feels side effects",
  confused: "Feels confused about it",
  scared: "Feels scared",
  pharmacy_issue: "Pharmacy problem",
  does_not_feel_necessary: "Not sure it is needed"
};

export function barrierLabel(barrier: MedicationBarrier): string {
  return barrierLabels[barrier];
}

const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  confirmed: "Confirmed with your care team",
  patient_reported: "You shared this",
  imported: "Imported from your records",
  inferred: "Likely, worth a check",
  needs_review: "Needs a quick check"
};

export function evidenceStatusLabel(status: EvidenceStatus): string {
  return evidenceStatusLabels[status];
}
