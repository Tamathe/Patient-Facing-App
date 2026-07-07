import { describe, expect, it } from "vitest";
import { backdatedSentAt, escalationDue } from "./referral-followup";
import type { Referral, ReferralStageEntry } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-07T12:00:00.000Z");

function referral(tier: Referral["tier"], daysAgo: number, extraStages: ReferralStageEntry[] = []): Referral {
  const sentAt = new Date(NOW.valueOf() - daysAgo * DAY_MS).toISOString();
  return {
    id: "referral-1",
    resultId: "result-1",
    tier,
    destinationId: "dest_hazard_optometry",
    stageHistory: [
      { stage: "drafted", at: sentAt, note: "" },
      { stage: "sent", at: sentAt, note: "" },
      ...extraStages
    ],
    sentAt
  };
}

describe("escalationDue — locked thresholds", () => {
  it("urgent referrals stall after 2 days, not at 2", () => {
    expect(escalationDue(referral("retina_urgent", 2), NOW)).toBe(false);
    expect(escalationDue(referral("retina_urgent", 2.5), NOW)).toBe(true);
    expect(escalationDue(referral("retina_urgent", 3), NOW)).toBe(true);
  });

  it("routine referrals stall after 5 days, not at 5", () => {
    expect(escalationDue(referral("optometry_routine", 5), NOW)).toBe(false);
    expect(escalationDue(referral("optometry_routine", 5.5), NOW)).toBe(true);
    expect(escalationDue(referral("optometry_routine", 6), NOW)).toBe(true);
  });

  it("never fires for a tier with no threshold", () => {
    expect(escalationDue(referral("none", 30), NOW)).toBe(false);
  });

  it("is idempotent — an already-stalled referral does not fire again", () => {
    const stalled = referral("optometry_routine", 8, [{ stage: "stalled", at: NOW.toISOString(), note: "" }]);
    expect(escalationDue(stalled, NOW)).toBe(false);
  });

  it("never fires after the clinic confirmed, scheduled, or completed", () => {
    for (const stage of ["clinic_confirmed", "scheduled", "completed"] as const) {
      const moving = referral("retina_urgent", 10, [{ stage, at: NOW.toISOString(), note: "" }]);
      expect(escalationDue(moving, NOW), stage).toBe(false);
    }
  });
});

describe("backdatedSentAt", () => {
  it("moves sentAt back by whole days — a real timestamp, not a fake clock", () => {
    expect(backdatedSentAt("2026-07-07T12:00:00.000Z", 5)).toBe("2026-07-02T12:00:00.000Z");
  });
});
