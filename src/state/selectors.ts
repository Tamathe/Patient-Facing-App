import type { AppState } from "@/domain/types";

// True when the latest assistant message is a crisis message the patient has not
// acknowledged yet. Voice sessions refuse to start in this state so the on-screen
// crisis resources stay the focus.
export function hasUnacknowledgedCrisis(state: AppState): boolean {
  for (let index = state.aiMessages.length - 1; index >= 0; index -= 1) {
    const message = state.aiMessages[index];
    if (message.role === "assistant") {
      return message.safety === "crisis" && !message.acknowledged;
    }
  }
  return false;
}
