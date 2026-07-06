import { describe, expect, it } from "vitest";
import { brentState, demoState } from "@/domain/fixtures";
import { recordAuditEvent } from "@/domain/audit";
import { healthReducer } from "./store";
import type { GlucoseReading } from "@/domain/types";

describe("healthReducer", () => {
  it("completeOnboarding sets the primary and full conditions, preserving the plan relationship", () => {
    const next = healthReducer(demoState, { type: "completeOnboarding", conditions: ["diabetes", "hypertension"] });

    expect(next.carePlan.conditions).toEqual(["hypertension", "diabetes"]);
    expect(next.carePlan.condition).toBe("hypertension");
    expect(next.carePlan.patientId).toBe(demoState.patient.id);
    expect(next.auditEvents.at(-1)?.label).toContain("Onboarding");
  });

  it("adds a glucose reading and audit event", () => {
    const reading: GlucoseReading = {
      id: "g-1",
      patientId: demoState.patient.id,
      valueMgDl: 120,
      measuredAt: "2026-07-05T07:00:00.000Z",
      contexts: ["morning"],
      note: ""
    };
    const next = healthReducer({ ...demoState, glucoseReadings: [] }, { type: "addGlucoseReading", reading });

    expect(next.glucoseReadings).toHaveLength(1);
    expect(next.glucoseReadings[0].valueMgDl).toBe(120);
    expect(next.auditEvents.at(-1)?.label).toContain("Blood sugar");
  });

  it("adds a blood pressure reading and audit event", () => {
    const next = healthReducer({ ...demoState, readings: [] }, {
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

  it("appends a meal log entry and records an audit event", () => {
    const next = healthReducer(demoState, {
      type: "addMealLogEntry",
      entry: {
        id: "meal-1",
        patientId: "patient-1",
        loggedAt: "2026-07-05T12:00:00.000Z",
        food: { id: "1", barcode: "1", name: "Soup", brand: null, category: null, nutrition: null, source: "barcode_seed" },
        flags: ["890 mg sodium"],
        assistantSummary: "High in sodium."
      }
    });

    expect(next.mealLog).toHaveLength(1);
    expect(next.mealLog[0].id).toBe("meal-1");
    expect(next.auditEvents.at(-1)?.label).toBe("Meal logged from Food Lens");
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

  it("audits an assistant crisis message as crisis_escalated instead of ai_generated", () => {
    const next = healthReducer(demoState, {
      type: "addAiMessage",
      message: {
        id: "message-crisis",
        mode: "trouble",
        role: "assistant",
        content: "Please reach out now: call or text 988.",
        createdAt: "2026-07-06T12:00:00.000Z",
        safety: "crisis",
        sources: [],
        actions: ["crisis_call_988", "crisis_text_988", "call_emergency", "safety_plan"]
      }
    });

    expect(next.aiMessages.at(-1)?.safety).toBe("crisis");
    expect(next.auditEvents.at(-1)?.action).toBe("crisis_escalated");
    expect(next.auditEvents.at(-1)?.label).toBe("Crisis resources shown");
  });

  it("marks a crisis message acknowledged and audits the acknowledgement", () => {
    const withMessage = healthReducer(demoState, {
      type: "addAiMessage",
      message: {
        id: "message-crisis",
        mode: "trouble",
        role: "assistant",
        content: "Please reach out now.",
        createdAt: "2026-07-06T12:00:00.000Z",
        safety: "crisis",
        sources: [],
        actions: ["crisis_call_988"]
      }
    });

    const next = healthReducer(withMessage, { type: "acknowledgeCrisis", messageId: "message-crisis" });

    expect(next.aiMessages.find((message) => message.id === "message-crisis")?.acknowledged).toBe(true);
    expect(next.auditEvents.at(-1)?.action).toBe("updated");
    expect(next.auditEvents.at(-1)?.label).toBe("Crisis resources acknowledged");
  });

  it("logs a medication refill and records a created audit event", () => {
    const next = healthReducer(demoState, {
      type: "logMedicationFill",
      fill: {
        id: "fill-1",
        patientId: "patient-1",
        medicationId: "med-1",
        medicationName: "Lisinopril",
        dateOfService: "2026-06-01",
        daysSupply: 30,
        source: "patient_reported"
      }
    });

    expect(next.medicationFills).toHaveLength(1);
    expect(next.medicationFills[0].id).toBe("fill-1");
    expect(next.auditEvents.at(-1)?.action).toBe("created");
    expect(next.auditEvents.at(-1)?.label).toBe("Medication refill logged");
  });

  it("records a phq9 assessment event and audits assessment_recorded", () => {
    const next = healthReducer(demoState, {
      type: "addAssessmentEvent",
      event: {
        id: "assessment-1",
        patientId: "patient-1",
        instrumentId: "phq9",
        itemResponses: [1, 1, 1, 1, 1, 0, 0, 0, 0],
        totalScore: 5,
        severityBand: "mild",
        status: "patient_reported",
        recordedAt: "2026-07-06T12:00:00.000Z"
      }
    });

    expect(next.assessmentEvents).toHaveLength(1);
    expect(next.auditEvents.at(-1)?.action).toBe("assessment_recorded");
  });

  it("loads the Brent fixture through resetDemo with a patient argument", () => {
    const next = healthReducer(demoState, { type: "resetDemo", patient: "brent" });
    expect(next).toEqual(brentState);
    expect(healthReducer(brentState, { type: "resetDemo" })).toEqual(demoState);
  });

  it("updates accessibility preferences and audits the change", () => {
    const next = healthReducer(demoState, {
      type: "updateAccessibilityPreferences",
      preferences: ["large_text", "high_contrast"]
    });

    expect(next.patient.accessibilityPreferences).toEqual(["large_text", "high_contrast"]);
    expect(next.auditEvents.at(-1)?.action).toBe("updated");
    expect(next.auditEvents.at(-1)?.label).toBe("Display and access preferences updated");
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
