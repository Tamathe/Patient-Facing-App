import { escalationThresholdDays } from "./dr-triage";
import type { Referral, ReferralStage } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Any of these stages means the loop is moving (or already escalated) — the
// silence alarm must fire at most once and never after contact.
const SUPPRESSING_STAGES: ReferralStage[] = ["clinic_confirmed", "scheduled", "completed", "stalled"];

// True when a referral has sat past its LOCKED call window (2 days urgent /
// 5 days routine) with no clinic contact. Elapsed time is the real clock vs
// sentAt — demo controls backdate sentAt, never fake the clock.
export function escalationDue(referral: Referral, now: Date): boolean {
  const thresholdDays = escalationThresholdDays(referral.tier);
  if (thresholdDays === null) {
    return false;
  }
  if (referral.stageHistory.some((entry) => SUPPRESSING_STAGES.includes(entry.stage))) {
    return false;
  }
  return now.valueOf() - new Date(referral.sentAt).valueOf() > thresholdDays * DAY_MS;
}

export function backdatedSentAt(sentAt: string, days: number): string {
  return new Date(new Date(sentAt).valueOf() - days * DAY_MS).toISOString();
}
