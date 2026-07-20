import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import type { DoseEvent } from "@/domain/types";
import { DEFAULT_DOSE_REMINDER } from "@/domain/reminders";
import { healthReducer } from "./store";

function doseEvent(overrides: Partial<DoseEvent> = {}): DoseEvent {
  return {
    id: "dose-x",
    patientId: "patient-1",
    medicationId: "med-1",
    date: "2026-07-05",
    status: "taken",
    barrier: null,
    recordedAt: "2026-07-05T08:00:00.000Z",
    ...overrides
  };
}

describe("healthReducer dose actions", () => {
  it("updates the complete reminder preference and records an audit event", () => {
    const preference = {
      ...DEFAULT_DOSE_REMINDER,
      enabled: true,
      timeLocal: "08:30",
      weekends: false,
      permission: "granted" as const
    };

    const next = healthReducer(demoState, { type: "setDoseReminder", preference });

    expect(next.doseReminder).toEqual(preference);
    expect(next.auditEvents.at(-1)?.action).toBe("updated");
    expect(next.auditEvents.at(-1)?.label).toBe("Dose reminder preference updated");
  });

  it("logs a taken dose and records an audit event", () => {
    const next = healthReducer(demoState, { type: "logDose", event: doseEvent() });

    expect(next.doseEvents.some((event) => event.date === "2026-07-05" && event.status === "taken")).toBe(true);
    expect(next.auditEvents.at(-1)?.label).toBe("Medication marked taken");
  });

  it("replaces an existing dose for the same medication and day", () => {
    const first = healthReducer(demoState, { type: "logDose", event: doseEvent({ status: "taken" }) });
    const second = healthReducer(first, {
      type: "logDose",
      event: doseEvent({ id: "dose-y", status: "skipped", barrier: "forgot" })
    });
    const todayDoses = second.doseEvents.filter(
      (event) => event.medicationId === "med-1" && event.date === "2026-07-05"
    );

    expect(todayDoses).toHaveLength(1);
    expect(todayDoses[0].status).toBe("skipped");
  });

  it("adds the barrier to the medication when a dose is skipped", () => {
    const next = healthReducer(demoState, {
      type: "logDose",
      event: doseEvent({ status: "skipped", barrier: "side_effects" })
    });

    expect(next.medications[0].activeBarriers).toContain("side_effects");
  });

  it("undoes a logged dose", () => {
    const logged = healthReducer(demoState, { type: "logDose", event: doseEvent() });
    const undone = healthReducer(logged, { type: "undoDose", medicationId: "med-1", date: "2026-07-05" });

    expect(undone.doseEvents.some((event) => event.date === "2026-07-05")).toBe(false);
  });
});
