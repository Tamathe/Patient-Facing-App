import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { healthReducer } from "./store";

describe("healthReducer", () => {
  it("adds a blood pressure reading and audit event", () => {
    const next = healthReducer(demoState, {
      type: "addReading",
      reading: {
        id: "reading-1",
        patientId: "patient-1",
        systolic: 128,
        diastolic: 82,
        pulse: 72,
        measuredAt: "2026-07-05T09:00:00.000Z",
        contexts: ["morning"],
        note: "Before coffee"
      }
    });

    expect(next.readings).toHaveLength(1);
    expect(next.auditEvents.at(-1)?.label).toBe("Blood pressure reading added");
  });

  it("captures a medication barrier without removing existing medicine details", () => {
    const next = healthReducer(demoState, {
      type: "setMedicationBarriers",
      medicationId: "med-1",
      barriers: ["cost", "side_effects"]
    });

    expect(next.medications[0].name).toBe("Lisinopril");
    expect(next.medications[0].activeBarriers).toEqual(["cost", "side_effects"]);
  });

  it("returns demo state for an explicit resetDemo action", () => {
    const modifiedState = {
      ...demoState,
      readings: [
        {
          id: "reading-1",
          patientId: "patient-1",
          systolic: 128,
          diastolic: 82,
          pulse: 72,
          measuredAt: "2026-07-05T09:00:00.000Z",
          contexts: ["morning"],
          note: "Before coffee"
        }
      ],
      medications: [
        {
          ...demoState.medications[0],
          activeBarriers: ["cost"]
        }
      ]
    };

    const next = healthReducer(modifiedState, { type: "resetDemo" });

    expect(next).toEqual(demoState);
  });
});
