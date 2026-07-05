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

  it("does not throw when saveStoredState cannot write", () => {
    const originalState = { ...demoState, readings: [...demoState.readings] };
    const setItemSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage is full");
    });

    expect(() => saveStoredState(originalState)).not.toThrow();
    expect(clearStoredState()).toBeUndefined();

    setItemSpy.mockRestore();
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
});
