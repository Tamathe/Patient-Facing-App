import type { AssessmentEvent } from "./assessment";

export type EvidenceStatus = "confirmed" | "patient_reported" | "imported" | "inferred" | "needs_review";
export type ThresholdSource = "clinician_authored" | "standard_education";

export type AccessibilityPreference =
  | "read_aloud"
  | "large_text"
  | "screen_reader"
  | "high_contrast"
  | "keyboard_navigation";

export type PatientProfile = {
  id: string;
  name: string;
  preferredName: string;
  language: "en" | "es";
  primaryClinicName: string;
  primaryClinicPhone: string;
  county?: string;
  accessibilityPreferences?: AccessibilityPreference[];
};

export type CareGoal = {
  id: string;
  label: string;
  reason: string;
};

export type Condition = "hypertension" | "diabetes" | "obesity";

export type CarePlan = {
  id: string;
  patientId: string;
  condition: Condition;
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
  kind: "reading" | "medicine" | "visit" | "intake" | "privacy" | "checkin";
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

export type AiMode = "explain" | "today" | "why" | "ask" | "trouble" | "visit" | "summarize" | "food";

export type AiMessageAction =
  | "call_clinic"
  | "draft_message"
  | "crisis_call_988"
  | "crisis_text_988"
  | "call_emergency"
  | "safety_plan";

export type SafetyLevel = "allowed" | "escalate" | "blocked" | "crisis";

export type AiMessage = {
  id: string;
  mode: AiMode;
  role: "patient" | "assistant";
  content: string;
  createdAt: string;
  safety: SafetyLevel;
  sources: string[];
  banner?: string;
  actions?: AiMessageAction[];
  acknowledged?: boolean;
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
  action:
    | "created"
    | "updated"
    | "ai_generated"
    | "shared"
    | "exported"
    | "deleted"
    | "crisis_escalated"
    | "assessment_recorded";
  label: string;
  createdAt: string;
};

export type NutritionFacts = {
  servingSize: string;
  calories: number | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  totalSugarsG: number | null;
  addedSugarsG: number | null;
  saturatedFatG: number | null;
  fiberG: number | null;
  proteinG: number | null;
  carbsG: number | null;
};

export type FoodSource = "barcode_off" | "barcode_fdc" | "barcode_seed" | "vision_estimate";

export type IdentifiedFood = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  nutrition: NutritionFacts | null;
  source: FoodSource;
};

export type MealLogEntry = {
  id: string;
  patientId: string;
  loggedAt: string;
  food: IdentifiedFood;
  flags: string[];
  assistantSummary: string;
};

export type DoseStatus = "taken" | "skipped";

export type DoseEvent = {
  id: string;
  patientId: string;
  medicationId: string;
  date: string;
  status: DoseStatus;
  barrier: MedicationBarrier | null;
  recordedAt: string;
};

export type MedicationFill = {
  id: string;
  patientId: string;
  medicationId: string;
  medicationName: string;
  dateOfService: string;
  daysSupply: number;
  source: EvidenceStatus;
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
  mealLog: MealLogEntry[];
  doseEvents: DoseEvent[];
  medicationFills: MedicationFill[];
  assessmentEvents: AssessmentEvent[];
};
