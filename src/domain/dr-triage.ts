import type { DrGrade, DrReportExtraction, ReferralTier, RecallReminder, ScreeningOutcome, ScreeningResult } from "./types";

// Dr. Carvalho's referral rules — the LOCKED clinical triage table from
// docs/plans/09. Tests assert it verbatim; do not "improve" it here.
//
// | Report                            | Outcome      | Tier               | Recall               |
// | ungradable                        | ungradable   | none               | rebook now (repeat)  |
// | no_dr                             | normal       | none               | 12 months            |
// | mild_npdr                         | normal       | none               | 12 months + emphasis |
// | moderate/severe_npdr, no DME      | abnormal     | optometry_routine  | specialist-managed   |
// | any DME, or pdr                   | abnormal     | retina_urgent      | specialist-managed   |

const ABNORMAL_GRADES: DrGrade[] = ["moderate_npdr", "severe_npdr", "pdr"];

export function outcomeForGrade(
  extraction: Pick<DrReportExtraction, "grade" | "dmePresent" | "ungradable">
): ScreeningOutcome {
  if (extraction.ungradable || extraction.grade === null) {
    return "ungradable";
  }
  if (extraction.dmePresent === true || ABNORMAL_GRADES.includes(extraction.grade)) {
    return "abnormal";
  }
  return "normal";
}

// DME beats grade: macular edema at any severity is retina-urgent.
export function tierForResult(
  result: Pick<ScreeningResult, "outcome" | "grade" | "dmePresent">
): ReferralTier {
  if (result.outcome !== "abnormal") {
    return "none";
  }
  if (result.dmePresent === true || result.grade === "pdr") {
    return "retina_urgent";
  }
  return "optometry_routine";
}

// Annual recall applies only to the normal outcomes; abnormal results are
// specialist-managed and ungradable rebooks now through the repeat flow.
export function recallMonthsFor(grade: DrGrade | null): number | null {
  return grade === "no_dr" || grade === "mild_npdr" ? 12 : null;
}

export function recallReasonFor(grade: DrGrade | null): RecallReminder["reason"] | null {
  if (grade === "no_dr") {
    return "annual_rescreen";
  }
  if (grade === "mild_npdr") {
    return "annual_rescreen_mild";
  }
  return null;
}

// LOCKED escalation thresholds: silence past this many days without a
// clinic_confirmed stage marks the referral stalled.
export function escalationThresholdDays(tier: ReferralTier): number | null {
  if (tier === "retina_urgent") {
    return 2;
  }
  if (tier === "optometry_routine") {
    return 5;
  }
  return null;
}

// Patient-facing framing of the same thresholds ("expect a call within N days").
export function expectCallWithinDays(tier: ReferralTier): number | null {
  return escalationThresholdDays(tier);
}

// UTC month math so the recall date is stable across DST boundaries.
export function recallDateFrom(confirmedAt: string, months = 12): string {
  const date = new Date(confirmedAt);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

// Selects the LOCKED plain-language copy branch for a read report. DME wins
// over the grade branch, mirroring the tier rule.
export function gradeStringKey(
  extraction: Pick<DrReportExtraction, "grade" | "dmePresent" | "ungradable">
): "gradeNoDr" | "gradeMild" | "gradeModerateSevere" | "gradeDmePdr" | "gradeUngradable" {
  if (extraction.ungradable || extraction.grade === null) {
    return "gradeUngradable";
  }
  if (extraction.dmePresent === true || extraction.grade === "pdr") {
    return "gradeDmePdr";
  }
  if (extraction.grade === "moderate_npdr" || extraction.grade === "severe_npdr") {
    return "gradeModerateSevere";
  }
  if (extraction.grade === "mild_npdr") {
    return "gradeMild";
  }
  return "gradeNoDr";
}
