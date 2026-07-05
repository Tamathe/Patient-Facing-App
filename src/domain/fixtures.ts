import type { AppState } from "./types";

export const demoState: AppState = {
  patient: {
    id: "patient-1",
    name: "Jordan Taylor",
    preferredName: "Jordan",
    language: "en",
    primaryClinicName: "Bluegrass Primary Care",
    primaryClinicPhone: "555-0142"
  },
  carePlan: {
    id: "plan-1",
    patientId: "patient-1",
    condition: "hypertension",
    plainLanguageSummary: "You are working on keeping blood pressure in a safer range at home so your heart, brain, and kidneys have less strain over time.",
    goals: [
      {
        id: "goal-1",
        label: "Understand my blood pressure",
        reason: "Knowing your usual range helps you and your care team spot changes earlier."
      },
      {
        id: "goal-2",
        label: "Take medicines with confidence",
        reason: "Blood pressure medicine can help even when you do not feel symptoms."
      }
    ],
    dailyActions: ["Check blood pressure in the morning before coffee.", "Take blood pressure medicine as prescribed.", "Write down dizziness, swelling, chest pain, or missed doses."],
    callThresholdSystolic: 160,
    callThresholdDiastolic: 100,
    thresholdSource: "clinician_authored",
    warningSymptoms: ["chest pain", "shortness of breath", "weakness on one side", "new confusion", "severe headache"],
    nextVisitReason: "Review two weeks of home blood pressure readings and medication barriers."
  },
  medications: [
    {
      id: "med-1",
      patientId: "patient-1",
      name: "Lisinopril",
      dose: "10 mg",
      schedule: "Once daily",
      purpose: "Helps lower blood pressure.",
      preventionBenefit: "Lower blood pressure can reduce the chance of stroke, heart attack, kidney problems, and heart strain.",
      safetyNote: "Do not stop or change the dose without asking your clinician.",
      source: "patient_reported",
      activeBarriers: []
    }
  ],
  readings: [],
  tasks: [],
  contextItems: [],
  extractedFacts: [],
  aiMessages: [],
  auditEvents: []
};
