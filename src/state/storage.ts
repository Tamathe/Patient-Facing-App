import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";

const STORAGE_KEY = "home-health-ai-ownership-state";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasArray(value: unknown, key: string): value is unknown[] {
  return isObject(value) && Array.isArray(value[key]);
}

function hasString(value: unknown, key: string): boolean {
  return isObject(value) && typeof value[key] === "string";
}

function isValidAppState(value: unknown): value is AppState {
  if (!isObject(value)) {
    return false;
  }

  if (!isObject(value.patient) || !hasString(value.patient, "id") || !hasString(value.patient, "name") || !hasString(value.patient, "preferredName")) {
    return false;
  }

  if (!isObject(value.carePlan) || !hasString(value.carePlan, "id") || !hasString(value.carePlan, "patientId") || !hasString(value.carePlan, "condition")) {
    return false;
  }

  if (
    !hasArray(value, "medications") ||
    !hasArray(value, "readings") ||
    !hasArray(value, "tasks") ||
    !hasArray(value, "contextItems") ||
    !hasArray(value, "extractedFacts") ||
    !hasArray(value, "aiMessages") ||
    !hasArray(value, "auditEvents")
  ) {
    return false;
  }

  return true;
}

export function loadStoredState(): AppState {
  if (typeof window === "undefined") {
    return demoState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return demoState;
  }

  try {
    const parsed = JSON.parse(raw);
    if (isValidAppState(parsed)) {
      return parsed;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    return demoState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return demoState;
  }
}

export function saveStoredState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
