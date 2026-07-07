import type { ScreeningOutcome } from "./types";

// Ported from rhtp-prototype src/lib/retinopathy-protocol.ts (copy-and-adapt).
// The event/status unions are trimmed to what this app actually emits — no
// navigator hub, no consent queue — but the machine keeps the original
// properties the tests assert: results route to the correct close-loop state,
// later states never regress on earlier events, and closed states stay closed.
export type ProtocolStatus =
  | "identified"
  | "explained"
  | "site_matched"
  | "scheduled"
  | "completed"
  | "normal_closed"
  | "abnormal_referral_needed"
  | "repeat_needed";

export type ProtocolEventType =
  | "care_gap_imported"
  | "gap_explained"
  | "site_matched"
  | "appointment_confirmed"
  | "result_imported"
  | "referral_scheduled"
  | "repeat_scheduled";

const EVENT_TRANSITIONS: Partial<Record<ProtocolEventType, ProtocolStatus>> = {
  care_gap_imported: "identified",
  gap_explained: "explained",
  site_matched: "site_matched",
  appointment_confirmed: "scheduled",
  referral_scheduled: "abnormal_referral_needed",
  repeat_scheduled: "repeat_needed"
};

const RESULT_TRANSITIONS: Record<ScreeningOutcome, ProtocolStatus> = {
  normal: "normal_closed",
  abnormal: "abnormal_referral_needed",
  ungradable: "repeat_needed"
};

const PROTOCOL_STATE_ORDER: Record<ProtocolStatus, number> = {
  identified: 0,
  explained: 1,
  site_matched: 2,
  scheduled: 3,
  completed: 4,
  normal_closed: 5,
  abnormal_referral_needed: 6,
  repeat_needed: 7
};

const TERMINAL_STATES = new Set<ProtocolStatus>(["normal_closed"]);

function shouldTransition(current: ProtocolStatus, next: ProtocolStatus): boolean {
  if (TERMINAL_STATES.has(current)) {
    return false;
  }
  return PROTOCOL_STATE_ORDER[next] >= PROTOCOL_STATE_ORDER[current];
}

export function nextProtocolStatus(
  current: ProtocolStatus,
  eventType: ProtocolEventType,
  outcome?: ScreeningOutcome
): ProtocolStatus {
  if (eventType === "result_imported") {
    if (!outcome) {
      return current;
    }

    const next = RESULT_TRANSITIONS[outcome];
    return shouldTransition(current, next) ? next : current;
  }

  const next = EVENT_TRANSITIONS[eventType] ?? current;
  return shouldTransition(current, next) ? next : current;
}
