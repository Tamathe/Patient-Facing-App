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
import { demoState } from "@/domain/fixtures";
import { recordAuditEvent } from "@/domain/audit";
import type {
  AiMessage,
  AppState,
  AuditEvent,
  CareContextItem,
  ExtractedFact,
  HomeReading,
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
  | { type: "resetDemo" };

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
    case "resetDemo":
      return {
        ...demoState,
        auditEvents: [recordAuditEvent(state.patient.id, "deleted", "Demo data deleted")]
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
