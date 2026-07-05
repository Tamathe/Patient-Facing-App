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
});
