import type { AppState, HealthBrief } from "./types";

type HealthBriefBuildOptions = {
  generatedAt?: string;
};

export function buildHealthBrief(state: AppState, options: HealthBriefBuildOptions = {}): HealthBrief {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const recentReadings = state.readings.slice(-7).map(
    (reading) =>
      `${reading.systolic}/${reading.diastolic}${reading.pulse ? ` pulse ${reading.pulse}` : ""}`
  );
  const medicationItems = state.medications.map((medication) => {
    const barrierText =
      medication.activeBarriers.length > 0 ? ` Barriers: ${medication.activeBarriers.join(", ")}.` : " No barriers marked.";
    return `${medication.name} ${medication.dose} ${medication.schedule}.${barrierText}`;
  });
  const hasMedicines = medicationItems.length > 0;
  const medicineItems = hasMedicines
    ? medicationItems
    : ["No medicines are listed yet. Add them so your care team can review everything you take."];
  const confirmedInstructions = state.extractedFacts.filter((fact) => fact.status === "confirmed").map((fact) => fact.value);
  const { carePlan } = state;
  const callThresholdParts = [
    carePlan.callThresholdSystolic !== null ? `${carePlan.callThresholdSystolic} systolic` : null,
    carePlan.callThresholdDiastolic !== null ? `${carePlan.callThresholdDiastolic} diastolic` : null
  ].filter(Boolean) as string[];
  const hasCarePlanThresholds = callThresholdParts.length > 0;
  const hasWarningSymptoms = carePlan.warningSymptoms.length > 0;
  const hasUrgentGuidance = hasCarePlanThresholds || hasWarningSymptoms;
  const urgencySectionStatus = hasUrgentGuidance
    ? carePlan.thresholdSource === "clinician_authored"
      ? "confirmed"
      : "inferred"
    : "needs_review";
  const urgencySourceText =
    carePlan.thresholdSource === "clinician_authored"
      ? "Clinician-confirmed care-plan guidance."
      : "Standard education guidance for urgent threshold planning.";
  const urgencyItems = hasUrgentGuidance
    ? [
        urgencySourceText,
        ...(
          hasCarePlanThresholds
            ? [`Call the team if your blood pressure reaches ${callThresholdParts.join(" or ")} mmHg.`]
            : []
        ),
        ...(
          hasWarningSymptoms ? [`Seek urgent care right away for: ${carePlan.warningSymptoms.join(", ")}.`] : []
        )
      ]
    : [
        "No clinician call thresholds or warning symptoms are currently listed yet.",
        "Please review these urgent thresholds with your care team."
      ];

  return {
    id: "brief-current",
    patientId: state.patient.id,
    generatedAt,
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
        title: "When to call my care team",
        items: urgencyItems,
        status: urgencySectionStatus
      },
      {
        title: "Medicines and barriers",
        items: medicineItems,
        status: hasMedicines ? "patient_reported" : "needs_review"
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
