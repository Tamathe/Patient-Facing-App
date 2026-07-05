import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";

const STORAGE_KEY = "home-health-ai-ownership-state";

export function loadStoredState(): AppState {
  if (typeof window === "undefined") {
    return demoState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return demoState;
  }

  return JSON.parse(raw) as AppState;
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
