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
  readings: [
    {
      id: "reading-1",
      patientId: "patient-1",
      systolic: 132,
      diastolic: 84,
      pulse: 72,
      measuredAt: "2026-07-02T07:15:00.000Z",
      contexts: ["morning"],
      note: ""
    },
    {
      id: "reading-2",
      patientId: "patient-1",
      systolic: 141,
      diastolic: 88,
      pulse: 75,
      measuredAt: "2026-07-03T07:05:00.000Z",
      contexts: ["morning"],
      note: ""
    },
    {
      id: "reading-3",
      patientId: "patient-1",
      systolic: 149,
      diastolic: 94,
      pulse: 78,
      measuredAt: "2026-07-04T07:20:00.000Z",
      contexts: ["morning"],
      note: ""
    }
  ],
  tasks: [],
  contextItems: [],
  extractedFacts: [],
  aiMessages: [],
  auditEvents: [],
  mealLog: [],
  doseEvents: [
    {
      id: "dose-1",
      patientId: "patient-1",
      medicationId: "med-1",
      date: "2026-07-03",
      status: "taken",
      barrier: null,
      recordedAt: "2026-07-03T08:00:00.000Z"
    },
    {
      id: "dose-2",
      patientId: "patient-1",
      medicationId: "med-1",
      date: "2026-07-04",
      status: "taken",
      barrier: null,
      recordedAt: "2026-07-04T08:05:00.000Z"
    }
  ]
};

export const deletedDemoState: AppState = {
  patient: {
    id: "patient-deleted",
    name: "Deleted demo data",
    preferredName: "Demo",
    language: "en",
    primaryClinicName: "Care team",
    primaryClinicPhone: ""
  },
  carePlan: {
    id: "plan-deleted",
    patientId: "patient-deleted",
    condition: "hypertension",
    plainLanguageSummary: "Demo data has been deleted. Add new instructions or readings to start again.",
    goals: [],
    dailyActions: [],
    callThresholdSystolic: null,
    callThresholdDiastolic: null,
    thresholdSource: "standard_education",
    warningSymptoms: [],
    nextVisitReason: "Add care context to prepare for a future visit."
  },
  medications: [],
  readings: [],
  tasks: [],
  contextItems: [],
  extractedFacts: [],
  aiMessages: [],
  auditEvents: [],
  mealLog: [],
  doseEvents: []
};
