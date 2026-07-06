import { buildCareTeamMessage } from "./care-team-message";
import { toDateKey } from "./adherence";
import {
  buildRefillGapInsight,
  calculateDiabetesPdc,
  classifyDiabetesMedication,
  type DiabetesPdcResult,
  type PharmacyFillClaim,
  type RefillGapInsight
} from "./pdc-adherence";
import type { AppState, MedicationFill } from "./types";

export function toPharmacyFillClaims(fills: MedicationFill[]): PharmacyFillClaim[] {
  return fills.map((fill) => ({
    id: fill.id,
    medicationName: fill.medicationName,
    dateOfService: fill.dateOfService,
    daysSupply: fill.daysSupply
  }));
}

// Card-visibility predicate: at least one logged fill must be a recognizable
// diabetes medication (included) or insulin (excluded). Fills that only classify
// as needs_review do not surface the card.
export function hasDiabetesClassifiableFill(fills: MedicationFill[]): boolean {
  return fills.some((fill) => classifyDiabetesMedication(fill.medicationName).status !== "needs_review");
}

// Returns null when nothing classifies (card hidden). Otherwise runs the
// module-sanctioned honest to-date calculation: disenrollmentDate = today caps
// the denominator at the days elapsed so far rather than the full year.
export function getPdcToDate(state: AppState, today: Date): DiabetesPdcResult | null {
  if (!hasDiabetesClassifiableFill(state.medicationFills)) {
    return null;
  }

  return calculateDiabetesPdc({
    patientId: state.patient.id,
    measurementYear: today.getFullYear(),
    claims: toPharmacyFillClaims(state.medicationFills),
    disenrollmentDate: toDateKey(today)
  });
}

export type RefillGapDraft = {
  insight: RefillGapInsight;
  pdcPercent: number;
  draft: string;
};

// Wraps the refill-gap insight into a care-team draft. It maps the
// navigator_refill_barrier_review action onto the existing draft_message
// affordance and reports the coverage estimate WITHOUT any treatment
// recommendation — the ask is help with refills and cost, nothing clinical.
export function buildRefillGapDraft(state: AppState, result: DiabetesPdcResult): RefillGapDraft | null {
  const insight = buildRefillGapInsight(result);
  if (!insight) {
    return null;
  }

  const base = buildCareTeamMessage(state);
  const pdcLine = `- Medicine coverage: my refill-based estimate of diabetes medicine coverage so far this year is about ${result.pdcPercent}%, which is under the 80% mark. Refills or cost have been getting in the way, and I would like help sorting that out.`;

  return {
    insight,
    pdcPercent: result.pdcPercent,
    draft: `${base}\n${pdcLine}`
  };
}
