import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletedDemoState, demoState } from "@/domain/fixtures";
import { clearStoredState, loadStoredState, saveStoredState } from "./storage";

const STORAGE_KEY = "home-health-ai-ownership-state";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("removes structurally invalid but syntactically valid payloads and falls back to demo state", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        patient: { id: "patient-1", name: "Jordan", preferredName: "Jordan" },
        carePlan: { id: "plan-1", patientId: "patient-1", condition: "hypertension" },
        medications: "not-an-array",
        readings: [],
        tasks: [],
        contextItems: [],
        extractedFacts: [],
        aiMessages: [],
        auditEvents: []
      })
    );

    expect(() => loadStoredState()).not.toThrow();
    expect(loadStoredState()).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to demo state when localStorage.getItem throws", () => {
    const getItemSpy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(() => loadStoredState()).not.toThrow();
    expect(loadStoredState()).toEqual(demoState);

    getItemSpy.mockRestore();
  });

  it("falls back to demo state for malformed localStorage payloads and removes the entry", () => {
    window.localStorage.setItem(STORAGE_KEY, "{malformed json");

    expect(() => loadStoredState()).not.toThrow();
    expect(loadStoredState()).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to demo state for malformed medication entries and clears storage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        medications: [{}],
        readings: [],
        tasks: [],
        contextItems: [],
        extractedFacts: [],
        aiMessages: [],
        auditEvents: []
      })
    );

    const loaded = loadStoredState();

    expect(loaded).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps valid saved state when some tasks are invalid by dropping invalid tasks only", () => {
    const legacySavedState = {
      ...demoState,
      patient: {
        ...demoState.patient,
        name: "Saved Patient",
        preferredName: "Sam"
      },
      tasks: [
        {
          id: "task-valid-1",
          title: "Review readings",
          body: "Current readings can be shared with your care team.",
          href: "/chat",
          priority: 2,
          kind: "reading",
          status: "confirmed"
        },
        {
          id: "task-missing-status",
          title: "Missing status",
          body: "Task created before status was required.",
          href: "/chat",
          priority: 1,
          kind: "reading"
        },
        {
          id: "task-valid-2",
          title: "Prepare visit",
          body: "Review goals before your next visit.",
          href: "/visits",
          priority: 3,
          kind: "visit",
          status: "needs_review"
        }
      ],
      readings: [],
      contextItems: [],
      extractedFacts: [],
      aiMessages: [],
      auditEvents: []
    };

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(legacySavedState)
    );

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Saved Patient");
    expect(loaded.patient.preferredName).toBe("Sam");
    expect(loaded.tasks).toHaveLength(2);
    expect(loaded.tasks.map((task) => task.id)).toEqual(["task-valid-1", "task-valid-2"]);
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    expect(persisted).not.toBeNull();
    const persistedState = JSON.parse(persisted ?? "{}");
    expect(persistedState.tasks).toHaveLength(2);
    expect(persistedState.tasks.map((task) => task.id)).toEqual(["task-valid-1", "task-valid-2"]);
  });

  it("falls back to demo state for carePlan patient mismatch and clears storage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        carePlan: {
          ...demoState.carePlan,
          patientId: "another-patient"
        }
      })
    );

    const loaded = loadStoredState();

    expect(loaded).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to demo state for medication/readings patient mismatch and clears storage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        medications: [
          {
            ...demoState.medications[0],
            patientId: "another-patient"
          }
        ],
        readings: [
          {
            id: "reading-1",
            patientId: "patient-1",
            systolic: 126,
            diastolic: 81,
            pulse: null,
            measuredAt: "2026-07-05T09:00:00.000Z",
            contexts: ["morning"],
            note: "good"
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to demo state for malformed audit events and clears storage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        medications: [],
        readings: [],
        tasks: [],
        contextItems: [],
        extractedFacts: [],
        aiMessages: [],
        auditEvents: ["oops"]
      })
    );

    const loaded = loadStoredState();

    expect(loaded).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to demo state for non-finite care plan thresholds and clears storage", () => {
    const rawPayload = JSON.stringify(demoState).replace(
      "\"callThresholdSystolic\":160",
      "\"callThresholdSystolic\":1e309"
    );

    window.localStorage.setItem(STORAGE_KEY, rawPayload);

    const loaded = loadStoredState();

    expect(loaded).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not throw when saveStoredState cannot write", () => {
    const originalState = { ...demoState, readings: [...demoState.readings] };
    const setItemSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage is full");
    });

    expect(() => saveStoredState(originalState)).not.toThrow();
    expect(clearStoredState()).toBeUndefined();

    setItemSpy.mockRestore();
  });

  it("does not throw when clearStoredState cannot remove", () => {
    const removeItemSpy = vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new Error("Cannot remove");
    });

    expect(() => clearStoredState()).not.toThrow();
    expect(loadStoredState()).toEqual(demoState);

    removeItemSpy.mockRestore();
  });

  it("keeps a valid deleted demo state without rehydrating seeded demo data", () => {
    saveStoredState(deletedDemoState);

    const loaded = loadStoredState();

    expect(loaded.patient.id).toBe("patient-deleted");
    expect(loaded.patient.name).not.toBe(demoState.patient.name);
    expect(loaded.medications).toHaveLength(0);
    expect(loaded.readings).toHaveLength(0);
    expect(loaded.aiMessages).toHaveLength(0);
  });

  it("falls back to demo state for invalid reading pulse or contexts and clears storage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        readings: [
          {
            id: "bad-reading",
            patientId: demoState.patient.id,
            systolic: 120,
            diastolic: 80,
            pulse: "72",
            measuredAt: "2026-07-05T09:00:00.000Z",
            contexts: ["foo"],
            note: "invalid"
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to demo state for extracted facts with unknown contextItemId", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        contextItems: [
          {
            id: "context-1",
            patientId: "patient-1",
            title: "Lab update",
            rawText: "Sodium 140",
            sourceLabel: "Clinic portal",
            createdAt: "2026-07-04T00:00:00.000Z"
          }
        ],
        extractedFacts: [
          {
            id: "fact-1",
            contextItemId: "missing-context",
            label: "Sodium",
            value: "normal",
            confidence: "high",
            status: "inferred",
            sourceSnippet: "Sodium 140"
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("migrates a legacy state without mealLog to an empty meal log without resetting", () => {
    const legacy: Record<string, unknown> = {
      ...demoState,
      patient: { ...demoState.patient, name: "Legacy Patient", preferredName: "Legacy" }
    };
    delete legacy.mealLog;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Legacy Patient");
    expect(loaded.mealLog).toEqual([]);
    expect(loaded.readings).toHaveLength(demoState.readings.length);
  });

  it("drops malformed meal log entries while keeping the rest of the state", () => {
    const validEntry = {
      id: "meal-1",
      patientId: "patient-1",
      loggedAt: "2026-07-05T12:00:00.000Z",
      food: { id: "1", barcode: "1", name: "Soup", brand: null, category: null, nutrition: null, source: "barcode_seed" },
      flags: ["890 mg sodium"],
      assistantSummary: "High in sodium."
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...demoState, mealLog: [validEntry, {}] }));

    const loaded = loadStoredState();

    expect(loaded.mealLog).toHaveLength(1);
    expect(loaded.mealLog[0].id).toBe("meal-1");
    expect(loaded.patient.id).toBe("patient-1");
  });

  const validGlucose = {
    id: "glucose-1",
    patientId: "patient-1",
    valueMgDl: 120,
    measuredAt: "2026-07-05T07:00:00.000Z",
    contexts: ["morning"],
    note: ""
  };

  it("backfills a legacy payload with an empty glucoseReadings array without resetting", () => {
    const legacy: Record<string, unknown> = {
      ...demoState,
      patient: { ...demoState.patient, name: "Pre-Glucose Patient", preferredName: "Pre" }
    };
    delete legacy.glucoseReadings;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Pre-Glucose Patient");
    expect(loaded.glucoseReadings).toEqual([]);
  });

  it("keeps a valid glucose reading", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...demoState, glucoseReadings: [validGlucose] }));

    const loaded = loadStoredState();

    expect(loaded.glucoseReadings).toHaveLength(1);
    expect(loaded.glucoseReadings[0].valueMgDl).toBe(120);
  });

  it("drops malformed glucose readings while keeping the rest of the state", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...demoState, glucoseReadings: [validGlucose, {}] }));

    const loaded = loadStoredState();

    expect(loaded.glucoseReadings).toHaveLength(1);
    expect(loaded.glucoseReadings[0].id).toBe("glucose-1");
    expect(loaded.patient.id).toBe("patient-1");
  });

  it("drops a foreign-patient glucose reading from the persisted state", () => {
    const foreign = { ...validGlucose, id: "glucose-foreign", patientId: "another-patient" };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...demoState, glucoseReadings: [validGlucose, foreign] })
    );

    const loaded = loadStoredState();

    expect(loaded.glucoseReadings).toHaveLength(1);
    expect(loaded.glucoseReadings[0].id).toBe("glucose-1");

    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(persisted.glucoseReadings).toHaveLength(1);
    expect(persisted.glucoseReadings[0].id).toBe("glucose-1");
  });

  it("keeps optional glucose call thresholds on the care plan", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        carePlan: { ...demoState.carePlan, callThresholdGlucoseLow: 54, callThresholdGlucoseHigh: 300 }
      })
    );

    const loaded = loadStoredState();

    expect(loaded.carePlan.callThresholdGlucoseLow).toBe(54);
    expect(loaded.carePlan.callThresholdGlucoseHigh).toBe(300);
  });

  it("keeps an optional conditions array on the care plan", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        carePlan: { ...demoState.carePlan, conditions: ["hypertension", "diabetes"] }
      })
    );

    const loaded = loadStoredState();

    expect(loaded.carePlan.conditions).toEqual(["hypertension", "diabetes"]);
  });

  it("accepts food-mode ai messages", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        aiMessages: [
          {
            id: "message-1",
            mode: "food",
            role: "assistant",
            content: "That soup is high in sodium.",
            createdAt: "2026-07-05T12:00:00.000Z",
            safety: "allowed",
            sources: [demoState.carePlan.id]
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded.aiMessages).toHaveLength(1);
    expect(loaded.aiMessages[0].mode).toBe("food");
  });

  it("accepts a diabetes care plan condition", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...demoState, carePlan: { ...demoState.carePlan, condition: "diabetes" } })
    );

    const loaded = loadStoredState();

    expect(loaded.carePlan.condition).toBe("diabetes");
  });

  it("accepts a crisis ai message and crisis_escalated audit event", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        aiMessages: [
          {
            id: "message-crisis",
            mode: "trouble",
            role: "assistant",
            content: "Please reach out now: call or text 988.",
            createdAt: "2026-07-06T12:00:00.000Z",
            safety: "crisis",
            sources: [],
            actions: ["crisis_call_988", "crisis_text_988", "call_emergency", "safety_plan"]
          }
        ],
        auditEvents: [
          {
            id: "audit-crisis",
            patientId: "patient-1",
            action: "crisis_escalated",
            label: "Crisis resources shown",
            createdAt: "2026-07-06T12:00:00.000Z"
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded.aiMessages).toHaveLength(1);
    expect(loaded.aiMessages[0].safety).toBe("crisis");
    expect(loaded.aiMessages[0].actions).toEqual([
      "crisis_call_988",
      "crisis_text_988",
      "call_emergency",
      "safety_plan"
    ]);
    expect(loaded.auditEvents[0].action).toBe("crisis_escalated");
  });

  it("filters unknown ai message action strings without resetting the state", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        patient: { ...demoState.patient, name: "Kept Patient", preferredName: "Kept" },
        aiMessages: [
          {
            id: "message-mixed",
            mode: "trouble",
            role: "assistant",
            content: "Here are your options.",
            createdAt: "2026-07-06T12:00:00.000Z",
            safety: "crisis",
            sources: [],
            actions: ["crisis_call_988", "totally_made_up", "draft_message"]
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Kept Patient");
    expect(loaded.aiMessages[0].actions).toEqual(["crisis_call_988", "draft_message"]);
  });

  it("backfills a pre-fill payload with an empty medicationFills array", () => {
    const legacy: Record<string, unknown> = {
      ...demoState,
      patient: { ...demoState.patient, name: "Pre-Fill Patient", preferredName: "Pre" }
    };
    delete legacy.medicationFills;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Pre-Fill Patient");
    expect(loaded.medicationFills).toEqual([]);
    expect(loaded.doseEvents).toHaveLength(demoState.doseEvents.length);
  });

  it("keeps valid medication fills and drops foreign or unknown-medication fills", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        medicationFills: [
          {
            id: "fill-valid",
            patientId: "patient-1",
            medicationId: "med-1",
            medicationName: "Lisinopril",
            dateOfService: "2026-01-05",
            daysSupply: 30,
            source: "patient_reported"
          },
          {
            id: "fill-foreign",
            patientId: "another-patient",
            medicationId: "med-1",
            medicationName: "Lisinopril",
            dateOfService: "2026-01-05",
            daysSupply: 30,
            source: "patient_reported"
          },
          {
            id: "fill-unknown-med",
            patientId: "patient-1",
            medicationId: "med-does-not-exist",
            medicationName: "Ghost",
            dateOfService: "2026-01-05",
            daysSupply: 30,
            source: "patient_reported"
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded.medicationFills.map((fill) => fill.id)).toEqual(["fill-valid"]);
  });

  it("accepts a phq9 assessment event and backfills a pre-assessment payload", () => {
    const legacy: Record<string, unknown> = {
      ...demoState,
      assessmentEvents: [
        {
          id: "assessment-1",
          patientId: "patient-1",
          instrumentId: "phq9",
          itemResponses: [0, 1, 2, 3, 0, 0, 0, 0, 0],
          totalScore: 6,
          severityBand: "mild",
          status: "patient_reported",
          recordedAt: "2026-07-06T12:00:00.000Z"
        }
      ]
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadStoredState();

    expect(loaded.assessmentEvents).toHaveLength(1);
    expect(loaded.assessmentEvents[0].severityBand).toBe("mild");
  });

  it("backfills a payload with no assessmentEvents array", () => {
    const legacy: Record<string, unknown> = {
      ...demoState,
      patient: { ...demoState.patient, name: "Pre-Assessment", preferredName: "Pre" }
    };
    delete legacy.assessmentEvents;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Pre-Assessment");
    expect(loaded.assessmentEvents).toEqual([]);
  });

  it("loads a patient without an accessibilityPreferences field cleanly", () => {
    const legacyPatient: Record<string, unknown> = { ...demoState.patient };
    delete legacyPatient.accessibilityPreferences;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...demoState, patient: legacyPatient }));

    const loaded = loadStoredState();

    expect(loaded.patient.id).toBe("patient-1");
    expect(loaded.patient.accessibilityPreferences).toBeUndefined();
  });

  it("keeps valid accessibility preferences on the patient profile", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        patient: { ...demoState.patient, accessibilityPreferences: ["high_contrast", "keyboard_navigation"] }
      })
    );

    const loaded = loadStoredState();

    expect(loaded.patient.accessibilityPreferences).toEqual(["high_contrast", "keyboard_navigation"]);
  });

  it("loads a pre-crisis persisted payload without data loss", () => {
    const legacy = {
      ...demoState,
      patient: { ...demoState.patient, name: "Legacy Owner", preferredName: "Legacy" },
      aiMessages: [
        {
          id: "message-legacy",
          mode: "why",
          role: "assistant",
          content: "Lisinopril helps lower your blood pressure.",
          createdAt: "2026-07-01T12:00:00.000Z",
          safety: "allowed",
          sources: ["med-1"],
          actions: ["call_clinic", "draft_message"]
        }
      ]
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Legacy Owner");
    expect(loaded.aiMessages).toHaveLength(1);
    expect(loaded.aiMessages[0].actions).toEqual(["call_clinic", "draft_message"]);
    expect(loaded.readings).toHaveLength(demoState.readings.length);
    expect(loaded.doseEvents).toHaveLength(demoState.doseEvents.length);
  });

  // House tripwire for the DR sprint: a payload persisted before the screening
  // arrays existed must load with backfilled empties, never reset to demo.
  it("backfills a pre-DR-screening payload with empty screening arrays without resetting", () => {
    const legacy: Record<string, unknown> = {
      ...demoState,
      patient: { ...demoState.patient, name: "Pre-Screening Patient", preferredName: "Pre" }
    };
    delete legacy.screeningGaps;
    delete legacy.screeningResults;
    delete legacy.referrals;
    delete legacy.recallReminders;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadStoredState();

    expect(loaded.patient.name).toBe("Pre-Screening Patient");
    expect(loaded.screeningGaps).toEqual([]);
    expect(loaded.screeningResults).toEqual([]);
    expect(loaded.referrals).toEqual([]);
    expect(loaded.recallReminders).toEqual([]);
    expect(loaded.readings).toHaveLength(demoState.readings.length);
  });

  it("keeps a valid screening pathway and drops orphaned results and referrals", () => {
    const gap = { id: "gap-1", condition: "diabetes", status: "referral", lastScreeningDate: "2024-12-10" };
    const result = {
      id: "result-1",
      gapId: "gap-1",
      outcome: "abnormal",
      grade: "moderate_npdr",
      dmePresent: false,
      source: "photo_report",
      reportRef: "report-moderate-npdr.svg",
      confirmedAt: "2026-07-07T10:00:00.000Z"
    };
    const orphanResult = { ...result, id: "result-orphan", gapId: "gap-missing" };
    const referral = {
      id: "referral-1",
      resultId: "result-1",
      tier: "optometry_routine",
      destinationId: "dest-1",
      stageHistory: [
        { stage: "drafted", at: "2026-07-07T10:00:00.000Z", note: "Referral drafted from your confirmed report" },
        { stage: "sent", at: "2026-07-07T10:00:01.000Z", note: "Sent to the clinic" }
      ],
      sentAt: "2026-07-07T10:00:01.000Z"
    };
    const orphanReferral = { ...referral, id: "referral-orphan", resultId: "result-missing" };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        screeningGaps: [gap],
        screeningResults: [result, orphanResult, {}],
        referrals: [referral, orphanReferral],
        recallReminders: [{ id: "recall-1", dueAt: "2027-07-07T10:00:00.000Z", reason: "annual_rescreen" }, {}]
      })
    );

    const loaded = loadStoredState();

    expect(loaded.screeningGaps.map((entry) => entry.id)).toEqual(["gap-1"]);
    expect(loaded.screeningResults.map((entry) => entry.id)).toEqual(["result-1"]);
    expect(loaded.referrals.map((entry) => entry.id)).toEqual(["referral-1"]);
    expect(loaded.recallReminders.map((entry) => entry.id)).toEqual(["recall-1"]);
    expect(loaded.patient.id).toBe("patient-1");
  });

  it("keeps an ai message citing a screening result as a known source", () => {
    const gap = { id: "gap-1", condition: "diabetes", status: "referral", lastScreeningDate: "2024-12-10" };
    const result = {
      id: "result-cited",
      gapId: "gap-1",
      outcome: "normal",
      grade: "no_dr",
      dmePresent: false,
      source: "photo_report",
      reportRef: "report-no-dr.svg",
      confirmedAt: "2026-07-07T10:00:00.000Z"
    };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        screeningGaps: [gap],
        screeningResults: [result],
        aiMessages: [
          {
            id: "message-screening",
            mode: "ask",
            role: "assistant",
            content: "Your report from July 7 says no signs of diabetic eye disease were found.",
            createdAt: "2026-07-07T11:00:00.000Z",
            safety: "allowed",
            sources: ["result-cited"]
          }
        ]
      })
    );

    const loaded = loadStoredState();

    expect(loaded.aiMessages).toHaveLength(1);
    expect(loaded.screeningResults[0].id).toBe("result-cited");
  });
});
