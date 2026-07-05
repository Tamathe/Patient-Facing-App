import { beforeEach, describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { loadStoredState } from "./storage";

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

  it("falls back to demo state and removes malformed localStorage payload", () => {
    window.localStorage.setItem(STORAGE_KEY, "{malformed json");

    expect(() => loadStoredState()).not.toThrow();
    expect(loadStoredState()).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
