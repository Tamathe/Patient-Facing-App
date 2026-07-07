import { activeConditions } from "./condition-lens";
import { getDestinationById, getSiteById, monthsSince } from "./screening-sites";
import { tScreening, type Language } from "@/i18n/strings";
import type { AppState, Referral, ScreeningResult } from "./types";

export type ScreeningLens =
  | { kind: "due"; months: number | null }
  | { kind: "booked"; siteName: string; when: string }
  | { kind: "repeat" }
  | { kind: "referred"; destinationName: string }
  | { kind: "all_clear"; untilMonthYear: string };

// The diabetes condition-lens view of the screening pathway: one line that is
// honest about where the loop stands. Null when diabetes is not active or
// there is nothing to say.
export function screeningLens(state: AppState, now: Date): ScreeningLens | null {
  if (!activeConditions(state.carePlan).includes("diabetes")) {
    return null;
  }

  const gaps = state.screeningGaps;
  const overdue = gaps.find((gap) => gap.status === "overdue" || gap.status === "engaged");
  if (overdue) {
    return { kind: "due", months: overdue.lastScreeningDate ? monthsSince(overdue.lastScreeningDate, now) : null };
  }

  const scheduled = gaps.find((gap) => gap.status === "scheduled");
  if (scheduled) {
    const siteName = scheduled.scheduledSiteId ? getSiteById(scheduled.scheduledSiteId)?.name ?? "" : "";
    return { kind: "booked", siteName, when: scheduled.scheduledFor ?? "" };
  }

  if (gaps.some((gap) => gap.status === "repeat")) {
    return { kind: "repeat" };
  }

  if (gaps.some((gap) => gap.status === "referral")) {
    const latestResult = state.screeningResults.at(-1);
    const referral = latestResult
      ? state.referrals.find((candidate) => candidate.resultId === latestResult.id)
      : undefined;
    const destinationName = referral ? getDestinationById(referral.destinationId)?.name ?? "" : "";
    return { kind: "referred", destinationName };
  }

  const recall = state.recallReminders.at(-1);
  if (gaps.some((gap) => gap.status === "closed") && recall) {
    return {
      kind: "all_clear",
      untilMonthYear: new Date(recall.dueAt).toLocaleDateString(state.patient.language === "es" ? "es-US" : "en-US", {
        month: "long",
        year: "numeric"
      })
    };
  }

  return null;
}

export function screeningLensLine(lens: ScreeningLens, language: Language): string {
  switch (lens.kind) {
    case "due":
      return tScreening(language, "lensDue", { months: lens.months ?? 12 });
    case "booked":
      return tScreening(language, "lensBooked", { site: lens.siteName, when: lens.when });
    case "repeat":
      return tScreening(language, "lensRepeat");
    case "referred":
      return tScreening(language, "lensReferred", { name: lens.destinationName });
    case "all_clear":
      return tScreening(language, "lensAllClear", { monthYear: lens.untilMonthYear });
  }
}

// Where the lens should send the patient. All-clear is informational only.
export function screeningLensHref(lens: ScreeningLens): string | null {
  switch (lens.kind) {
    case "due":
      return "/screening?entry=sms";
    case "booked":
    case "repeat":
      return "/screening";
    case "referred":
      return "/screening/result";
    case "all_clear":
      return null;
  }
}

export type JourneyStep = { key: "screened" | "referral_sent" | "scheduled" | "completed"; label: string; done: boolean };

// The closed-loop summary: screened → referral sent → scheduled → completed.
export function screeningJourney(
  result: ScreeningResult,
  referral: Referral | undefined,
  language: Language
): JourneyStep[] {
  const screenedDate = new Date(result.confirmedAt).toLocaleDateString(language === "es" ? "es-US" : "en-US");
  const steps: JourneyStep[] = [
    { key: "screened", label: tScreening(language, "journeyScreened", { date: screenedDate }), done: true }
  ];
  if (!referral) {
    return steps;
  }
  const scheduled = referral.stageHistory.some((entry) => entry.stage === "scheduled");
  const completed = referral.stageHistory.some((entry) => entry.stage === "completed");
  steps.push({ key: "referral_sent", label: tScreening(language, "journeyReferralSent"), done: true });
  steps.push({
    key: "scheduled",
    label: scheduled
      ? tScreening(language, "journeyScheduled", { when: referral.scheduledFor ?? "" })
      : tScreening(language, "journeyAwaitingSchedule"),
    done: scheduled
  });
  steps.push({ key: "completed", label: tScreening(language, "journeyCompleted"), done: completed });
  return steps;
}
