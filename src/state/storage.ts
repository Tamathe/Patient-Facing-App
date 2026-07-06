import { demoState } from "@/domain/fixtures";
import type { AssessmentEvent, SeverityBand } from "@/domain/assessment";
import type {
  AppState,
  AiMessage,
  AiMessageAction,
  AuditEvent,
  CareContextItem,
  CarePlan,
  DoseEvent,
  EvidenceStatus,
  ExtractedFact,
  FoodSource,
  HomeReading,
  IdentifiedFood,
  MealLogEntry,
  Medication,
  MedicationBarrier,
  MedicationFill,
  NutritionFacts,
  PatientProfile,
  MeasurementContext,
  TaskItem,
  AiMode
} from "@/domain/types";

const STORAGE_KEY = "home-health-ai-ownership-state";

function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
  }
}

function getKnownSourceIds(state: AppState): Set<string> {
  const sourceIds = new Set<string>();

  sourceIds.add(state.carePlan.id);
  state.carePlan.goals.forEach((goal) => {
    sourceIds.add(goal.id);
  });
  state.medications.forEach((medication) => {
    sourceIds.add(medication.id);
  });
  state.readings.forEach((reading) => {
    sourceIds.add(reading.id);
  });
  state.contextItems.forEach((contextItem) => {
    sourceIds.add(contextItem.id);
  });
  state.extractedFacts.forEach((fact) => {
    sourceIds.add(fact.id);
  });

  return sourceIds;
}

function hasValidRelationships(state: AppState): boolean {
  const patientId = state.patient.id;

  if (state.carePlan.patientId !== patientId) {
    return false;
  }

  if (state.medications.some((medication) => medication.patientId !== patientId)) {
    return false;
  }

  if (state.readings.some((reading) => reading.patientId !== patientId)) {
    return false;
  }

  if (state.contextItems.some((item) => item.patientId !== patientId)) {
    return false;
  }

  if (state.auditEvents.some((event) => event.patientId !== patientId)) {
    return false;
  }

  const contextItemIds = new Set(state.contextItems.map((item) => item.id));
  if (state.extractedFacts.some((fact) => !contextItemIds.has(fact.contextItemId))) {
    return false;
  }

  const sourceIds = getKnownSourceIds(state);
  if (
    state.aiMessages.some((message) =>
      message.sources.some((sourceId) => sourceId.length > 0 && !sourceIds.has(sourceId))
    )
  ) {
    return false;
  }

  return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString<K extends string>(value: unknown, key: K): value is Record<K, string> & Record<string, unknown> {
  return isObject(value) && typeof value[key] === "string";
}

function hasNumber<K extends string>(value: unknown, key: K): value is Record<K, number> & Record<string, unknown> {
  return isObject(value) && typeof value[key] === "number" && Number.isFinite(value[key]);
}

function isArrayOfStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isArrayOfObjects<T>(value: unknown, itemGuard: (value: unknown) => value is T): value is T[] {
  return Array.isArray(value) && value.every(itemGuard);
}

function isEvidenceStatus(value: unknown): value is EvidenceStatus {
  return value === "confirmed" || value === "patient_reported" || value === "imported" || value === "inferred" || value === "needs_review";
}

function isTaskStatus(value: unknown): value is TaskItem["status"] {
  return value === "confirmed" || value === "inferred" || value === "needs_review";
}

function isMedicationBarrier(value: unknown): value is MedicationBarrier {
  return (
    value === "forgot" ||
    value === "ran_out" ||
    value === "cost" ||
    value === "side_effects" ||
    value === "confused" ||
    value === "scared" ||
    value === "pharmacy_issue" ||
    value === "does_not_feel_necessary"
  );
}

function isMeasurementContext(value: unknown): value is MeasurementContext {
  return (
    value === "morning" ||
    value === "evening" ||
    value === "before_medicine" ||
    value === "after_medicine" ||
    value === "after_coffee" ||
    value === "after_resting" ||
    value === "during_symptoms"
  );
}

function isMeasurementContextArray(value: unknown): value is MeasurementContext[] {
  return Array.isArray(value) && value.every((item) => isMeasurementContext(item));
}

function isLanguage(value: unknown): value is PatientProfile["language"] {
  return value === "en" || value === "es";
}

function isThresholdSource(value: unknown): value is CarePlan["thresholdSource"] {
  return value === "clinician_authored" || value === "standard_education";
}

function isAiMode(value: unknown): value is AiMode {
  return (
    value === "explain" ||
    value === "today" ||
    value === "why" ||
    value === "ask" ||
    value === "trouble" ||
    value === "visit" ||
    value === "summarize" ||
    value === "food"
  );
}

function hasNumberOrNull<K extends string>(value: Record<string, unknown>, key: K): boolean {
  const field = value[key];
  return field === null || (typeof field === "number" && Number.isFinite(field));
}

function isNutritionFacts(value: unknown): value is NutritionFacts {
  return (
    isObject(value) &&
    hasString(value, "servingSize") &&
    hasNumberOrNull(value, "calories") &&
    hasNumberOrNull(value, "sodiumMg") &&
    hasNumberOrNull(value, "potassiumMg") &&
    hasNumberOrNull(value, "totalSugarsG") &&
    hasNumberOrNull(value, "addedSugarsG") &&
    hasNumberOrNull(value, "saturatedFatG") &&
    hasNumberOrNull(value, "fiberG") &&
    hasNumberOrNull(value, "proteinG") &&
    hasNumberOrNull(value, "carbsG")
  );
}

function isFoodSource(value: unknown): value is FoodSource {
  return value === "barcode_off" || value === "barcode_fdc" || value === "barcode_seed" || value === "vision_estimate";
}

function isIdentifiedFood(value: unknown): value is IdentifiedFood {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    (value.barcode === null || typeof value.barcode === "string") &&
    hasString(value, "name") &&
    (value.brand === null || typeof value.brand === "string") &&
    (value.category === null || typeof value.category === "string") &&
    (value.nutrition === null || isNutritionFacts(value.nutrition)) &&
    isFoodSource(value.source)
  );
}

function isMealLogEntry(value: unknown): value is MealLogEntry {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasString(value, "loggedAt") &&
    isIdentifiedFood(value.food) &&
    isArrayOfStrings(value.flags) &&
    hasString(value, "assistantSummary")
  );
}

function isDoseEvent(value: unknown): value is DoseEvent {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasString(value, "medicationId") &&
    hasString(value, "date") &&
    (value.status === "taken" || value.status === "skipped") &&
    (value.barrier === null || isMedicationBarrier(value.barrier)) &&
    hasString(value, "recordedAt")
  );
}

function isSeverityBand(value: unknown): value is SeverityBand {
  return (
    value === "minimal" ||
    value === "mild" ||
    value === "moderate" ||
    value === "moderately_severe" ||
    value === "severe"
  );
}

function isAssessmentEvent(value: unknown): value is AssessmentEvent {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    value.instrumentId === "phq9" &&
    Array.isArray(value.itemResponses) &&
    value.itemResponses.every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0 && item <= 3) &&
    hasNumber(value, "totalScore") &&
    isSeverityBand(value.severityBand) &&
    value.status === "patient_reported" &&
    hasString(value, "recordedAt")
  );
}

function isMedicationFill(value: unknown): value is MedicationFill {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasString(value, "medicationId") &&
    hasString(value, "medicationName") &&
    hasString(value, "dateOfService") &&
    hasNumber(value, "daysSupply") &&
    isEvidenceStatus(value.source)
  );
}

function isMedication(value: unknown): value is Medication {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasString(value, "name") &&
    hasString(value, "dose") &&
    hasString(value, "schedule") &&
    hasString(value, "purpose") &&
    hasString(value, "preventionBenefit") &&
    hasString(value, "safetyNote") &&
    isEvidenceStatus(value.source) &&
    isArrayOfStrings(value.activeBarriers) &&
    value.activeBarriers.every(isMedicationBarrier)
  );
}

function isReading(value: unknown): value is HomeReading {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasNumber(value, "systolic") &&
    hasNumber(value, "diastolic") &&
    (value.pulse === null || hasNumber(value, "pulse")) &&
    hasString(value, "measuredAt") &&
    hasString(value, "note") &&
    isMeasurementContextArray(value.contexts)
  );
}

function isTask(value: unknown): value is TaskItem {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "title") &&
    hasString(value, "body") &&
    hasString(value, "href") &&
    (value.priority === 1 || value.priority === 2 || value.priority === 3) &&
    (value.kind === "reading" ||
      value.kind === "medicine" ||
      value.kind === "visit" ||
      value.kind === "intake" ||
      value.kind === "privacy" ||
      value.kind === "checkin") &&
    isTaskStatus(value.status)
  );
}

function isContextItem(value: unknown): value is CareContextItem {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasString(value, "title") &&
    hasString(value, "rawText") &&
    hasString(value, "sourceLabel") &&
    hasString(value, "createdAt")
  );
}

function isExtractedFact(value: unknown): value is ExtractedFact {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "contextItemId") &&
    hasString(value, "label") &&
    hasString(value, "value") &&
    (value.confidence === "high" || value.confidence === "medium" || value.confidence === "low") &&
    isEvidenceStatus(value.status) &&
    hasString(value, "sourceSnippet")
  );
}

function isAiMessage(value: unknown): value is AiMessage {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    isAiMode(value.mode) &&
    (value.role === "patient" || value.role === "assistant") &&
    hasString(value, "content") &&
    hasString(value, "createdAt") &&
    (value.safety === "allowed" ||
      value.safety === "escalate" ||
      value.safety === "blocked" ||
      value.safety === "crisis") &&
    isArrayOfStrings(value.sources)
  );
}

function isAiMessageAction(value: unknown): value is AiMessageAction {
  return (
    value === "call_clinic" ||
    value === "draft_message" ||
    value === "crisis_call_988" ||
    value === "crisis_text_988" ||
    value === "call_emergency" ||
    value === "safety_plan"
  );
}

// Actions are not part of the isAiMessage guard (they were never validated), so
// rather than introduce a new rejection vector we lenient-filter unknown action
// strings out of persisted messages. A rolled-back build that wrote a newer
// action value therefore loads cleanly instead of resetting to demoState.
function sanitizeAiMessageActions(messages: AiMessage[]): AiMessage[] {
  return messages.map((message) => {
    if (!Array.isArray(message.actions)) {
      return message;
    }
    const filtered = message.actions.filter(isAiMessageAction);
    if (filtered.length === message.actions.length) {
      return message;
    }
    return { ...message, actions: filtered };
  });
}

function isAuditEvent(value: unknown): value is AuditEvent {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasString(value, "label") &&
    (value.action === "created" ||
      value.action === "updated" ||
      value.action === "ai_generated" ||
      value.action === "shared" ||
      value.action === "exported" ||
      value.action === "deleted" ||
      value.action === "crisis_escalated" ||
      value.action === "assessment_recorded") &&
    hasString(value, "createdAt")
  );
}

function isCareGoal(value: unknown): value is CarePlan["goals"][number] {
  return isObject(value) && hasString(value, "id") && hasString(value, "label") && hasString(value, "reason");
}

function isCarePlan(value: unknown): value is CarePlan {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "patientId") &&
    hasString(value, "condition") &&
    (value.condition === "hypertension" || value.condition === "diabetes" || value.condition === "obesity") &&
    hasString(value, "plainLanguageSummary") &&
    isArrayOfObjects(value.goals, isCareGoal) &&
    isArrayOfStrings(value.dailyActions) &&
    (value.callThresholdSystolic === null || Number.isFinite(value.callThresholdSystolic)) &&
    (value.callThresholdDiastolic === null || Number.isFinite(value.callThresholdDiastolic)) &&
    isThresholdSource(value.thresholdSource) &&
    isArrayOfStrings(value.warningSymptoms) &&
    hasString(value, "nextVisitReason")
  );
}

function isPatient(value: unknown): value is PatientProfile {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasString(value, "preferredName") &&
    isLanguage(value.language) &&
    hasString(value, "primaryClinicName") &&
    hasString(value, "primaryClinicPhone")
  );
}

type PersistedAppState = Omit<AppState, "tasks" | "mealLog" | "doseEvents" | "medicationFills" | "assessmentEvents"> & {
  tasks: unknown;
  mealLog: unknown;
  doseEvents: unknown;
  medicationFills: unknown;
  assessmentEvents: unknown;
};

function sanitizeTasks(tasks: unknown): TaskItem[] {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks.filter(isTask);
}

function sanitizeMealLog(mealLog: unknown, patientId: string): MealLogEntry[] {
  if (!Array.isArray(mealLog)) {
    return [];
  }

  return mealLog.filter((entry): entry is MealLogEntry => isMealLogEntry(entry) && entry.patientId === patientId);
}

function sanitizeDoseEvents(doseEvents: unknown, patientId: string, medicationIds: Set<string>): DoseEvent[] {
  if (!Array.isArray(doseEvents)) {
    return [];
  }

  return doseEvents.filter(
    (entry): entry is DoseEvent =>
      isDoseEvent(entry) && entry.patientId === patientId && medicationIds.has(entry.medicationId)
  );
}

function sanitizeMedicationFills(fills: unknown, patientId: string, medicationIds: Set<string>): MedicationFill[] {
  if (!Array.isArray(fills)) {
    return [];
  }

  return fills.filter(
    (entry): entry is MedicationFill =>
      isMedicationFill(entry) && entry.patientId === patientId && medicationIds.has(entry.medicationId)
  );
}

function sanitizeAssessmentEvents(events: unknown, patientId: string): AssessmentEvent[] {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.filter(
    (entry): entry is AssessmentEvent => isAssessmentEvent(entry) && entry.patientId === patientId
  );
}

function isValidCoreAppState(value: unknown): value is PersistedAppState {
  if (!isObject(value)) {
    return false;
  }

  if (!isPatient(value.patient)) {
    return false;
  }

  if (!isCarePlan(value.carePlan)) {
    return false;
  }

  if (
    !isArrayOfObjects(value.medications, isMedication) ||
    !isArrayOfObjects(value.readings, isReading) ||
    !isArrayOfObjects(value.contextItems, isContextItem) ||
    !isArrayOfObjects(value.extractedFacts, isExtractedFact) ||
    !isArrayOfObjects(value.aiMessages, isAiMessage) ||
    !isArrayOfObjects(value.auditEvents, isAuditEvent)
  ) {
    return false;
  }

  return hasValidRelationships(value as AppState);
}

function isValidAppState(value: unknown): value is AppState {
  if (!isValidCoreAppState(value)) {
    return false;
  }

  if (!Array.isArray(value.tasks) || !value.tasks.every(isTask)) {
    return false;
  }

  if (!Array.isArray(value.mealLog) || !value.mealLog.every(isMealLogEntry)) {
    return false;
  }

  if (!Array.isArray(value.doseEvents) || !value.doseEvents.every(isDoseEvent)) {
    return false;
  }

  if (!Array.isArray(value.medicationFills) || !value.medicationFills.every(isMedicationFill)) {
    return false;
  }

  return Array.isArray(value.assessmentEvents) && value.assessmentEvents.every(isAssessmentEvent);
}

export function loadStoredState(): AppState {
  if (typeof window === "undefined") {
    return demoState;
  }

  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) {
    return demoState;
  }

  try {
    const parsed = JSON.parse(raw);
    if (isObject(parsed) && parsed.mealLog === undefined) {
      parsed.mealLog = [];
    }
    if (isObject(parsed) && parsed.doseEvents === undefined) {
      parsed.doseEvents = [];
    }
    if (isObject(parsed) && parsed.medicationFills === undefined) {
      parsed.medicationFills = [];
    }
    if (isObject(parsed) && parsed.assessmentEvents === undefined) {
      parsed.assessmentEvents = [];
    }
    if (isValidCoreAppState(parsed)) {
      const sanitizedTasks = sanitizeTasks(parsed.tasks);
      const sanitizedMealLog = sanitizeMealLog(parsed.mealLog, parsed.patient.id);
      const medicationIds = new Set(parsed.medications.map((medication) => medication.id));
      const sanitizedDoseEvents = sanitizeDoseEvents(parsed.doseEvents, parsed.patient.id, medicationIds);
      const sanitizedMedicationFills = sanitizeMedicationFills(parsed.medicationFills, parsed.patient.id, medicationIds);
      const sanitizedAssessmentEvents = sanitizeAssessmentEvents(parsed.assessmentEvents, parsed.patient.id);
      const sanitizedAiMessages = sanitizeAiMessageActions(parsed.aiMessages);
      const sanitizedState: AppState = {
        ...parsed,
        tasks: sanitizedTasks,
        mealLog: sanitizedMealLog,
        doseEvents: sanitizedDoseEvents,
        medicationFills: sanitizedMedicationFills,
        assessmentEvents: sanitizedAssessmentEvents,
        aiMessages: sanitizedAiMessages
      };

      if (!isValidAppState(sanitizedState)) {
        safeRemoveItem(STORAGE_KEY);
        return demoState;
      }

      if (
        JSON.stringify(parsed.tasks) !== JSON.stringify(sanitizedState.tasks) ||
        JSON.stringify(parsed.mealLog) !== JSON.stringify(sanitizedState.mealLog) ||
        JSON.stringify(parsed.doseEvents) !== JSON.stringify(sanitizedState.doseEvents) ||
        JSON.stringify(parsed.medicationFills) !== JSON.stringify(sanitizedState.medicationFills) ||
        JSON.stringify(parsed.assessmentEvents) !== JSON.stringify(sanitizedState.assessmentEvents) ||
        JSON.stringify(parsed.aiMessages) !== JSON.stringify(sanitizedState.aiMessages)
      ) {
        safeSetItem(STORAGE_KEY, JSON.stringify(sanitizedState));
      }

      return sanitizedState;
    }

    safeRemoveItem(STORAGE_KEY);
    return demoState;
  } catch {
    safeRemoveItem(STORAGE_KEY);
    return demoState;
  }
}

export function saveStoredState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  safeSetItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredState(): void {
  if (typeof window === "undefined") {
    return;
  }

  safeRemoveItem(STORAGE_KEY);
}
