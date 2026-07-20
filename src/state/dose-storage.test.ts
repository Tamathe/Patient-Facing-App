import { afterEach, describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { clearStoredState, loadStoredState, saveStoredState } from "./storage";
import { DEFAULT_DOSE_REMINDER } from "@/domain/reminders";

const STORAGE_KEY = "home-health-ai-ownership-state";

afterEach(() => {
  clearStoredState();
});

describe("dose event storage", () => {
  it("round-trips the dose reminder preference", () => {
    const preference = {
      ...DEFAULT_DOSE_REMINDER,
      enabled: true,
      timeLocal: "08:30",
      weekends: false,
      permission: "granted" as const
    };

    saveStoredState({ ...demoState, doseReminder: preference });
    const loaded = loadStoredState();

    expect(loaded.doseReminder).toEqual(preference);
  });

  it("migrates a missing reminder preference without wiping medication data", () => {
    const stored = JSON.parse(JSON.stringify(demoState));
    delete stored.doseReminder;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const loaded = loadStoredState();

    expect(loaded.doseReminder).toEqual(DEFAULT_DOSE_REMINDER);
    expect(loaded.medications[0].name).toBe("Lisinopril");
    expect(loaded.doseEvents).toHaveLength(demoState.doseEvents.length);
  });

  it("repairs a malformed reminder preference without wiping medication data", () => {
    const stored = {
      ...demoState,
      doseReminder: { enabled: true, timeLocal: "99:00", weekends: "sometimes", permission: "maybe" }
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const loaded = loadStoredState();

    expect(loaded.doseReminder).toEqual(DEFAULT_DOSE_REMINDER);
    expect(loaded.medications[0].name).toBe("Lisinopril");
    expect(loaded.doseEvents).toHaveLength(demoState.doseEvents.length);
  });

  it("round-trips dose events through save and load", () => {
    saveStoredState(demoState);
    const loaded = loadStoredState();

    expect(loaded.doseEvents).toHaveLength(demoState.doseEvents.length);
    expect(loaded.doseEvents[0].status).toBe("taken");
  });

  it("migrates a stored state without doseEvents to an empty array without wiping data", () => {
    const stored = JSON.parse(JSON.stringify(demoState));
    delete stored.doseEvents;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const loaded = loadStoredState();

    expect(loaded.doseEvents).toEqual([]);
    expect(loaded.medications[0].name).toBe("Lisinopril");
  });

  it("drops dose events that reference an unknown medication", () => {
    const polluted = {
      ...demoState,
      doseEvents: [
        ...demoState.doseEvents,
        {
          id: "bad",
          patientId: "patient-1",
          medicationId: "ghost-med",
          date: "2026-07-05",
          status: "taken",
          barrier: null,
          recordedAt: "2026-07-05T08:00:00.000Z"
        }
      ]
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(polluted));

    const loaded = loadStoredState();

    expect(loaded.doseEvents.some((event) => event.medicationId === "ghost-med")).toBe(false);
    expect(loaded.doseEvents).toHaveLength(demoState.doseEvents.length);
  });
});
