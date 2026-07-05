import type { AppState, HealthBrief } from "./types";

export function buildHealthBrief(state: AppState): HealthBrief {
  const recentReadings = state.readings.slice(-7).map(
    (reading) =>
      `${reading.systolic}/${reading.diastolic}${reading.pulse ? ` pulse ${reading.pulse}` : ""}`
  );
  const medicationItems = state.medications.map((medication) => {
    const barrierText =
      medication.activeBarriers.length > 0 ? ` Barriers: ${medication.activeBarriers.join(", ")}.` : " No barriers marked.";
    return `${medication.name} ${medication.dose} ${medication.schedule}.${barrierText}`;
  });
  const confirmedInstructions = state.extractedFacts.filter((fact) => fact.status === "confirmed").map((fact) => fact.value);

  return {
    id: "brief-current",
    patientId: state.patient.id,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "What I am working on",
        items: [state.carePlan.plainLanguageSummary],
        status: "confirmed"
      },
      {
        title: "Recent home readings",
        items: recentReadings.length > 0 ? recentReadings : ["No home readings logged yet."],
        status: recentReadings.length > 0 ? "patient_reported" : "needs_review"
      },
      {
        title: "Medicines and barriers",
        items: medicationItems,
        status: "patient_reported"
      },
      {
        title: "Confirmed instructions",
        items: confirmedInstructions.length > 0 ? confirmedInstructions : ["No uploaded instructions confirmed yet."],
        status: confirmedInstructions.length > 0 ? "confirmed" : "needs_review"
      },
      {
        title: "Questions for my care team",
        items: [
          "What should I do if readings stay above my call threshold?",
          "Are any medicine side effects expected or concerning?",
          "What number pattern should make me call sooner?"
        ],
        status: "inferred"
      }
    ]
  };
}
