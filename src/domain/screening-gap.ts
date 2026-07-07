import type { ScreeningGap, ScreeningGapStatus, ScreeningOutcome } from "./types";

// Ported from rhtp-prototype src/lib/screening-gap.ts (copy-and-adapt): the gap
// lifecycle for a diabetic-retinopathy screening. The edges are the product:
// a gap can only be closed by a completed screening (or reconciliation), an
// abnormal result parks it in "referral", and an ungradable photo loops back
// through "repeat" to another booking.
export const LEGAL_TRANSITIONS: Record<ScreeningGapStatus, ScreeningGapStatus[]> = {
  overdue: ["engaged", "closed"],
  engaged: ["scheduled", "closed"],
  scheduled: ["completed"],
  completed: ["closed", "referral", "repeat"],
  closed: [],
  referral: [],
  repeat: ["scheduled"]
};

export function canTransition(from: ScreeningGapStatus, to: ScreeningGapStatus): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}

export function transition(gap: ScreeningGap, to: ScreeningGapStatus): ScreeningGap {
  if (!canTransition(gap.status, to)) {
    throw new Error(`Illegal transition ${gap.status} -> ${to}`);
  }
  return { ...gap, status: to };
}

export function outcomeToStatus(outcome: ScreeningOutcome): ScreeningGapStatus {
  const map: Record<ScreeningOutcome, ScreeningGapStatus> = {
    normal: "closed",
    abnormal: "referral",
    ungradable: "repeat"
  };
  return map[outcome];
}
