export type EvidenceStatus = "confirmed" | "patient_reported" | "imported" | "inferred" | "needs_review";
export type ThresholdSource = "clinician_authored" | "standard_education";

export type PatientProfile = {
  id: string;
  name: string;
  preferredName: string;
  language: "en" | "es";
  primaryClinicName: string;
  primaryClinicPhone: string;
};

export type CareGoal = {
  id: string;
  label: string;
  reason: string;
};

export type CarePlan = {
  id: string;
  patientId: string;
  condition: "hypertension";
  plainLanguageSummary: string;
  goals: CareGoal[];
  dailyActions: string[];
  callThresholdSystolic: number | null;
  callThresholdDiastolic: number | null;
  thresholdSource: ThresholdSource;
  warningSymptoms: string[];
  nextVisitReason: string;
};

export type MedicationBarrier =
  | "forgot"
  | "ran_out"
  | "cost"
  | "side_effects"
  | "confused"
  | "scared"
  | "pharmacy_issue"
  | "does_not_feel_necessary";

export type Medication = {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  schedule: string;
  purpose: string;
  preventionBenefit: string;
  safetyNote: string;
  source: EvidenceStatus;
  activeBarriers: MedicationBarrier[];
};

export type MeasurementContext = "morning" | "evening" | "before_medicine" | "after_medicine" | "after_coffee" | "after_resting" | "during_symptoms";

export type HomeReading = {
  id: string;
  patientId: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: string;
  contexts: MeasurementContext[];
  note: string;
};

export type TaskItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  priority: 1 | 2 | 3;
  kind: "reading" | "medicine" | "visit" | "intake" | "privacy";
  status: "confirmed" | "inferred" | "needs_review";
};

export type CareContextItem = {
  id: string;
  patientId: string;
  title: string;
  rawText: string;
  sourceLabel: string;
  createdAt: string;
};

export type ExtractedFact = {
  id: string;
  contextItemId: string;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  status: EvidenceStatus;
  sourceSnippet: string;
};

export type AiMode = "explain" | "today" | "why" | "ask" | "trouble" | "visit" | "summarize";

export type AiMessage = {
  id: string;
  mode: AiMode;
  role: "patient" | "assistant";
  content: string;
  createdAt: string;
  safety: "allowed" | "escalate" | "blocked";
  sources: string[];
};

export type HealthBrief = {
  id: string;
  patientId: string;
  generatedAt: string;
  sections: Array<{
    title: string;
    items: string[];
    status: EvidenceStatus;
  }>;
};

export type AuditEvent = {
  id: string;
  patientId: string;
  action: "created" | "updated" | "ai_generated" | "shared" | "exported" | "deleted";
  label: string;
  createdAt: string;
};

export type AppState = {
  patient: PatientProfile;
  carePlan: CarePlan;
  medications: Medication[];
  readings: HomeReading[];
  tasks: TaskItem[];
  contextItems: CareContextItem[];
  extractedFacts: ExtractedFact[];
  aiMessages: AiMessage[];
  auditEvents: AuditEvent[];
};
