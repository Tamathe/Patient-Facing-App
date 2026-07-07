import { describe, expect, it } from "vitest";
import { brentState, demoState } from "@/domain/fixtures";
import { screeningJourney, screeningLens, screeningLensHref, screeningLensLine } from "./screening-status";
import type { AppState, Referral, ScreeningResult } from "./types";

const NOW = new Date("2026-07-07T12:00:00.000Z");

const result: ScreeningResult = {
  id: "result-1",
  gapId: "gap-brent-dr",
  outcome: "abnormal",
  grade: "moderate_npdr",
  dmePresent: false,
  source: "photo_report",
  reportRef: "report-moderate-npdr.svg",
  confirmedAt: "2026-07-07T10:00:00.000Z"
};

const referral: Referral = {
  id: "referral-1",
  resultId: "result-1",
  tier: "optometry_routine",
  destinationId: "dest_hazard_optometry",
  stageHistory: [
    { stage: "drafted", at: "2026-07-07T10:00:00.000Z", note: "" },
    { stage: "sent", at: "2026-07-07T10:00:00.000Z", note: "" }
  ],
  sentAt: "2026-07-07T10:00:00.000Z"
};

describe("screeningLens", () => {
  it("is null when diabetes is not an active condition", () => {
    expect(screeningLens(demoState, NOW)).toBeNull();
  });

  it("reads due from an overdue gap with the months since the last photo", () => {
    const lens = screeningLens(brentState, NOW);
    expect(lens).toMatchObject({ kind: "due", months: 19 });
    expect(screeningLensLine(lens!, "en")).toContain("19 months");
    expect(screeningLensHref(lens!)).toBe("/screening?entry=sms");
  });

  it("reads booked from a scheduled gap", () => {
    const state: AppState = {
      ...brentState,
      screeningGaps: [
        { ...brentState.screeningGaps[0], status: "scheduled", scheduledSiteId: "site_fqhc_mobile", scheduledFor: "Tuesday 2:40 PM" }
      ]
    };
    const lens = screeningLens(state, NOW);
    expect(lens).toMatchObject({ kind: "booked", siteName: "Perry County FQHC Mobile Camera", when: "Tuesday 2:40 PM" });
    expect(screeningLensHref(lens!)).toBe("/screening");
  });

  it("reads referred with the destination name", () => {
    const state: AppState = {
      ...brentState,
      screeningGaps: [{ ...brentState.screeningGaps[0], status: "referral" }],
      screeningResults: [result],
      referrals: [referral]
    };
    const lens = screeningLens(state, NOW);
    expect(lens).toMatchObject({ kind: "referred", destinationName: "Hazard Optometry Associates" });
    expect(screeningLensHref(lens!)).toBe("/screening/result");
  });

  it("reads all-clear with the recall month once closed", () => {
    const state: AppState = {
      ...brentState,
      screeningGaps: [{ ...brentState.screeningGaps[0], status: "closed" }],
      recallReminders: [{ id: "recall-1", dueAt: "2027-07-07T10:00:00.000Z", reason: "annual_rescreen" }]
    };
    const lens = screeningLens(state, NOW);
    expect(lens).toMatchObject({ kind: "all_clear", untilMonthYear: "July 2027" });
    expect(screeningLensHref(lens!)).toBeNull();
    expect(screeningLensLine(lens!, "en")).toBe("Eyes all clear until July 2027.");
  });

  it("reads repeat when the last photo was ungradable", () => {
    const state: AppState = {
      ...brentState,
      screeningGaps: [{ ...brentState.screeningGaps[0], status: "repeat" }]
    };
    expect(screeningLens(state, NOW)).toMatchObject({ kind: "repeat" });
  });
});

describe("screeningJourney", () => {
  it("summarizes the closed loop: screened → referral sent → scheduled → completed", () => {
    const booked: Referral = {
      ...referral,
      scheduledFor: "Tue Jul 14 · 9:20 AM",
      stageHistory: [...referral.stageHistory, { stage: "scheduled", at: "2026-07-08T10:00:00.000Z", note: "" }]
    };
    const steps = screeningJourney(result, booked, "en");
    expect(steps.map((step) => step.key)).toEqual(["screened", "referral_sent", "scheduled", "completed"]);
    expect(steps[0].done).toBe(true);
    expect(steps[2]).toMatchObject({ done: true });
    expect(steps[2].label).toContain("Tue Jul 14 · 9:20 AM");
    expect(steps[3].done).toBe(false);
  });

  it("shows the expect-a-call stage while unscheduled and stops at screened with no referral", () => {
    const steps = screeningJourney(result, referral, "en");
    expect(steps[2].done).toBe(false);
    expect(steps[2].label).toContain("expect the clinic's call");

    expect(screeningJourney(result, undefined, "en")).toHaveLength(1);
  });
});
