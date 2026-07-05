import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { recordAuditEvent } from "@/domain/audit";
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

  it("returns seeded demo state for an explicit resetDemo action", () => {
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

  it("deletes demo data without reseeding personal demo content", () => {
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

    const next = healthReducer(modifiedState, { type: "deleteDemoData" });

    expect(next.patient.id).toBe("patient-deleted");
    expect(next.patient.name).not.toBe(demoState.patient.name);
    expect(next.medications).toHaveLength(0);
    expect(next.readings).toHaveLength(0);
    expect(next.contextItems).toHaveLength(0);
    expect(next.aiMessages).toHaveLength(0);
    expect(next.auditEvents).toHaveLength(1);
    expect(next.auditEvents[0]).toMatchObject({
      action: "deleted",
      label: "Demo data deleted",
      patientId: "patient-deleted"
    });
    expect(next.auditEvents[0]?.createdAt).toBeTypeOf("string");
  });

  it("records an exported event through addAuditEvent for privacy actions", () => {
    const exportedEvent = recordAuditEvent(demoState.patient.id, "exported", "Data exported");
    const next = healthReducer(demoState, {
      type: "addAuditEvent",
      event: exportedEvent
    });

    expect(next.auditEvents).toHaveLength(1);
    expect(next.auditEvents[0]).toEqual(exportedEvent);
    expect(next.auditEvents[0]?.action).toBe("exported");
    expect(next.auditEvents[0]?.label).toBe("Data exported");
  });
});
