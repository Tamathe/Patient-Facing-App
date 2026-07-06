import type { SourceFact } from "@/domain/grounding";
import type { AppState } from "@/domain/types";

// Builds the grounding source-fact set from on-device state. Every fact id is an
// existing app source id (the same id set as storage's getKnownSourceIds), so a
// provider response's `sources` array doubles as the grounding `citationIds`.
export function collectSourceFacts(state: AppState): SourceFact[] {
  const facts: SourceFact[] = [];
  const plan = state.carePlan;
  const clinicName = state.patient.primaryClinicName;

  const thresholdText =
    plan.callThresholdSystolic !== null && plan.callThresholdDiastolic !== null
      ? ` Call threshold ${plan.callThresholdSystolic}/${plan.callThresholdDiastolic}.`
      : "";

  facts.push({
    id: plan.id,
    label: "Care plan",
    value: `${plan.plainLanguageSummary}${thresholdText} Condition: ${plan.condition}.`,
    sourceKind: "care_plan",
    sourceName: clinicName,
    confidence: plan.thresholdSource === "clinician_authored" ? "confirmed" : "inferred",
    patientConfirmed: false,
    effectiveDate: ""
  });

  plan.goals.forEach((goal) => {
    facts.push({
      id: goal.id,
      label: goal.label,
      value: `${goal.label}. ${goal.reason}`,
      sourceKind: "goal",
      sourceName: clinicName,
      confidence: "inferred",
      patientConfirmed: false,
      effectiveDate: ""
    });
  });

  state.medications.forEach((medication) => {
    facts.push({
      id: medication.id,
      label: medication.name,
      value: `${medication.name} ${medication.dose} ${medication.schedule}. ${medication.purpose}`,
      sourceKind: "medication",
      sourceName: clinicName,
      confidence: medication.source,
      patientConfirmed: medication.source === "confirmed",
      effectiveDate: ""
    });
  });

  state.readings.forEach((reading) => {
    facts.push({
      id: reading.id,
      label: "Home reading",
      value: `${reading.systolic}/${reading.diastolic}`,
      sourceKind: "reading",
      sourceName: "Home monitor",
      confidence: "patient_reported",
      patientConfirmed: true,
      effectiveDate: reading.measuredAt
    });
  });

  state.contextItems.forEach((item) => {
    facts.push({
      id: item.id,
      label: item.title,
      value: item.rawText,
      sourceKind: "context_item",
      sourceName: item.sourceLabel,
      confidence: "imported",
      patientConfirmed: false,
      effectiveDate: item.createdAt
    });
  });

  state.extractedFacts.forEach((fact) => {
    facts.push({
      id: fact.id,
      label: fact.label,
      value: fact.value,
      sourceKind: "extracted_fact",
      sourceName: "Extracted from care context",
      confidence: fact.status,
      patientConfirmed: fact.status === "confirmed",
      effectiveDate: ""
    });
  });

  return facts;
}
