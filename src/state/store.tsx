"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode
} from "react";
import { deletedDemoState, demoState } from "@/domain/fixtures";
import { recordAuditEvent } from "@/domain/audit";
import type {
  AiMessage,
  AppState,
  AuditEvent,
  CareContextItem,
  DoseEvent,
  ExtractedFact,
  HomeReading,
  MealLogEntry,
  MedicationBarrier
} from "@/domain/types";
import { loadStoredState, saveStoredState } from "./storage";

export type HealthAction =
  | { type: "addReading"; reading: HomeReading }
  | { type: "setMedicationBarriers"; medicationId: string; barriers: MedicationBarrier[] }
  | { type: "addContextItem"; item: CareContextItem; facts: ExtractedFact[] }
  | { type: "confirmFact"; factId: string }
  | { type: "addAiMessage"; message: AiMessage }
  | { type: "addAuditEvent"; event: AuditEvent }
  | { type: "addMealLogEntry"; entry: MealLogEntry }
  | { type: "logDose"; event: DoseEvent }
  | { type: "undoDose"; medicationId: string; date: string }
  | { type: "resetDemo" }
  | { type: "deleteDemoData" };

export function healthReducer(state: AppState, action: HealthAction): AppState {
  switch (action.type) {
    case "addReading": {
      return {
        ...state,
        readings: [...state.readings, action.reading],
        auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "created", "Blood pressure reading added")]
      };
    }
    case "setMedicationBarriers": {
      return {
        ...state,
        medications: state.medications.map((medication) =>
          medication.id === action.medicationId ? { ...medication, activeBarriers: action.barriers } : medication
        ),
        auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "updated", "Medication barrier updated")]
      };
    }
    case "addContextItem": {
      return {
        ...state,
        contextItems: [...state.contextItems, action.item],
        extractedFacts: [...state.extractedFacts, ...action.facts],
        auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "created", "Care instructions added")]
      };
    }
    case "confirmFact": {
      return {
        ...state,
        extractedFacts: state.extractedFacts.map((fact) =>
          fact.id === action.factId ? { ...fact, status: "confirmed" } : fact
        ),
        auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "updated", "Extracted fact confirmed")]
      };
    }
    case "addAiMessage": {
      return {
        ...state,
        aiMessages: [...state.aiMessages, action.message],
        auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "ai_generated", "AI response generated")]
      };
    }
    case "addAuditEvent": {
      return {
        ...state,
        auditEvents: [...state.auditEvents, action.event]
      };
    }
    case "addMealLogEntry": {
      return {
        ...state,
        mealLog: [...state.mealLog, action.entry],
        auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "created", "Meal logged from Food Lens")]
      };
    }
    case "logDose": {
      const { event } = action;
      const doseEvents = [
        ...state.doseEvents.filter(
          (existing) => !(existing.medicationId === event.medicationId && existing.date === event.date)
        ),
        event
      ];
      const barrier = event.barrier;
      const medications =
        barrier === null
          ? state.medications
          : state.medications.map((medication) =>
              medication.id === event.medicationId && !medication.activeBarriers.includes(barrier)
                ? { ...medication, activeBarriers: [...medication.activeBarriers, barrier] }
                : medication
            );
      return {
        ...state,
        doseEvents,
        medications,
        auditEvents: [
          ...state.auditEvents,
          recordAuditEvent(
            state.patient.id,
            "updated",
            event.status === "taken" ? "Medication marked taken" : "Medication marked skipped"
          )
        ]
      };
    }
    case "undoDose": {
      return {
        ...state,
        doseEvents: state.doseEvents.filter(
          (event) => !(event.medicationId === action.medicationId && event.date === action.date)
        ),
        auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "updated", "Medication dose entry removed")]
      };
    }
    case "resetDemo":
      return demoState;
    case "deleteDemoData":
      return {
        ...deletedDemoState,
        auditEvents: [recordAuditEvent(deletedDemoState.patient.id, "deleted", "Demo data deleted")]
      };
    default:
      return state;
  }
}

type HealthStateContextValue = {
  state: AppState;
  dispatch: Dispatch<HealthAction>;
};

const HealthStateContext = createContext<HealthStateContextValue | null>(null);

export function HealthStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(healthReducer, demoState, loadStoredState);

  useEffect(() => {
    saveStoredState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <HealthStateContext.Provider value={value}>{children}</HealthStateContext.Provider>;
}

export function useHealthState(): HealthStateContextValue {
  const value = useContext(HealthStateContext);

  if (!value) {
    throw new Error("useHealthState must be used inside HealthStateProvider");
  }

  return value;
}
