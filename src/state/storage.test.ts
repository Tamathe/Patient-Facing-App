import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
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

  it("falls back to demo state for tasks without status and clears storage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...demoState,
        tasks: [
          {
            id: "task-1",
            title: "Missing status",
            body: "Task created before validation update",
            href: "/chat",
            priority: 1,
            kind: "reading"
          }
        ],
        readings: [],
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
});
