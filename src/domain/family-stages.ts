import type { Language } from "@/i18n/strings";
import { renderNudge } from "./nudge-template";
import { perinatalCheckpoints, type PerinatalCheckpointMonth } from "./perinatal";
import { childAgeMonths } from "./family-screenings";
import type { DevNeedDomain, FamilyNavigatorState, FamilyProfile } from "./types";

export type FamilyStage = {
  id: string;
  timing: "now" | "next" | "later";
  title: string;
  description: string;
  domains: DevNeedDomain[];
  templateId: string;
  href?: string;
};

export type FamilyDiagnosisBackdateMonths = 0 | 1 | 3 | 6;

type FamilyStageDefinition = {
  title: string;
  domains: DevNeedDomain[];
  templateId: string;
  ageSensitive?: boolean;
  href?: string;
};

const YEAR_ONLY_TIMING_NOTE: Record<Language, string> = {
  en: "Timing is shown early because only the birth year is known.",
  es: "El momento se muestra temprano porque solo se conoce el año de nacimiento."
};

const STAGE_DEFINITIONS = {
  "first-steps": {
    title: "Contact First Steps now",
    domains: ["early_intervention"],
    templateId: "family_stage_first_steps_v1",
    ageSensitive: true
  },
  "age-three-transition": {
    title: "Plan ahead before age three",
    domains: ["early_intervention", "school_iep"],
    templateId: "family_stage_age_three_transition_v1",
    ageSensitive: true
  },
  "school-enrollment": {
    title: "Get ready for school",
    domains: ["school_iep"],
    templateId: "family_stage_school_enrollment_v1",
    ageSensitive: true
  },
  "waiver-apply": {
    title: "Ask how to apply for the Michelle P. Waiver",
    domains: ["waivers_financial"],
    templateId: "family_stage_waiver_apply_v1"
  },
  "school-arc": {
    title: "Get ready for the school ARC meeting",
    domains: ["school_iep"],
    templateId: "family_stage_school_arc_v1"
  },
  "parent-connection": {
    title: "Talk to another parent",
    domains: ["parent_support"],
    templateId: "family_stage_parent_connection_v1"
  },
  "sibling-respite": {
    title: "Look into help for siblings and a break for you",
    domains: ["sibling_support", "respite"],
    templateId: "family_stage_sibling_respite_v1"
  },
  "mission-transition": {
    title: "Start planning for adult life",
    domains: ["future_planning"],
    templateId: "family_stage_mission_transition_v1",
    ageSensitive: true
  },
  "before-eighteen": {
    title: "Get ready for age eighteen",
    domains: ["future_planning"],
    templateId: "family_stage_before_eighteen_v1",
    ageSensitive: true
  },
  "perinatal-check-1-month": {
    title: "Your 1-month check-in",
    domains: [],
    templateId: "perinatal_check_nudge_v1",
    href: "/checkin/perinatal"
  },
  "perinatal-check-2-month": {
    title: "Your 2-month check-in",
    domains: [],
    templateId: "perinatal_check_nudge_v1",
    href: "/checkin/perinatal"
  },
  "perinatal-check-4-month": {
    title: "Your 4-month check-in",
    domains: [],
    templateId: "perinatal_check_nudge_v1",
    href: "/checkin/perinatal"
  },
  "perinatal-check-6-month": {
    title: "Your 6-month check-in",
    domains: [],
    templateId: "perinatal_check_nudge_v1",
    href: "/checkin/perinatal"
  },
  "development-check-18-month": {
    title: "18-month development check",
    domains: [],
    templateId: "development_check_nudge_v1",
    href: "/checkin#for-family"
  },
  "development-check-30-month": {
    title: "30-month development check",
    domains: [],
    templateId: "development_check_nudge_v1",
    href: "/checkin#for-family"
  }
} satisfies Record<string, FamilyStageDefinition>;

type FamilyStageId = keyof typeof STAGE_DEFINITIONS;

function hasReachedAge(profile: FamilyProfile, now: Date, years: number): boolean {
  const months = childAgeMonths(profile, now);
  return months === null ? now.getUTCFullYear() - profile.birthYear >= years : months >= years * 12;
}

function isAgeSeventeen(profile: FamilyProfile, now: Date): boolean {
  const months = childAgeMonths(profile, now);
  if (months !== null) {
    return months >= 204 && months < 216;
  }

  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  return calendarAge === 17 || calendarAge === 18;
}

function isUnderThree(profile: FamilyProfile, now: Date): boolean {
  const months = childAgeMonths(profile, now);
  if (months !== null) {
    return months >= 0 && months < 36;
  }

  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  return calendarAge >= 0 && calendarAge <= 3;
}

function transitionWindowHasOpened(profile: FamilyProfile, now: Date): boolean {
  const months = childAgeMonths(profile, now);
  if (months !== null) {
    return months >= 27 && months < 36;
  }

  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  return calendarAge === 2 || calendarAge === 3;
}

function isInSchoolEnrollmentWindow(profile: FamilyProfile, now: Date): boolean {
  const months = childAgeMonths(profile, now);
  if (months !== null) {
    return months >= 48 && months < 72;
  }

  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  return calendarAge >= 4 && calendarAge <= 6;
}

function diagnosedSchoolAge(profile: FamilyProfile): boolean {
  return (
    profile.diagnoses.length > 0 &&
    (profile.schoolStage === "elementary" || profile.schoolStage === "middle" || profile.schoolStage === "high")
  );
}

function monthIndex(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function diagnosisMonthIndex(value: string | undefined): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? year * 12 + month - 1 : null;
}

function mostRecentDiagnosisMonth(profile: FamilyProfile, now: Date): number | null {
  const currentMonth = monthIndex(now);
  const diagnosisMonths = profile.diagnoses
    .map(({ diagnosedAt }) => diagnosisMonthIndex(diagnosedAt))
    .filter((candidate): candidate is number => candidate !== null && candidate <= currentMonth);

  return diagnosisMonths.length > 0 ? Math.max(...diagnosisMonths) : null;
}

function timingForDiagnosisOffset(anchorMonth: number, offsetMonths: number, now: Date): FamilyStage["timing"] {
  const monthsUntilDue = anchorMonth + offsetMonths - monthIndex(now);
  if (monthsUntilDue <= 0) {
    return "now";
  }
  return monthsUntilDue === 1 ? "next" : "later";
}

function buildStage(
  id: FamilyStageId,
  timing: FamilyStage["timing"],
  profile: FamilyProfile,
  language: Language,
  nudgeFirstName?: string
): FamilyStage | null {
  const definition = STAGE_DEFINITIONS[id];
  const slots: Record<string, string> = definition.templateId === "perinatal_check_nudge_v1"
    ? { firstName: nudgeFirstName ?? "" }
    : {};
  const rendered = renderNudge({ templateId: definition.templateId, language, slots });
  if (!rendered.ok) {
    return null;
  }

  const description =
    "ageSensitive" in definition && definition.ageSensitive && profile.birthMonth === undefined
      ? `${rendered.message} ${YEAR_ONLY_TIMING_NOTE[language]}`
      : rendered.message;

  return {
    id,
    timing,
    title: definition.title,
    description,
    domains: [...definition.domains],
    templateId: definition.templateId,
    ...("href" in definition ? { href: definition.href } : {})
  };
}

function pushStage(
  stages: FamilyStage[],
  id: FamilyStageId,
  timing: FamilyStage["timing"],
  profile: FamilyProfile,
  language: Language,
  nudgeFirstName?: string
): void {
  const stage = buildStage(id, timing, profile, language, nudgeFirstName);
  if (stage) {
    stages.push(stage);
  }
}

export function backdatedDiagnosisMonth(now: Date, monthsAgo: number): string {
  if (Number.isNaN(now.valueOf()) || !Number.isInteger(monthsAgo) || monthsAgo < 0) {
    throw new RangeError("Diagnosis backdate months must be a non-negative integer.");
  }

  const backdated = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return `${backdated.getUTCFullYear()}-${String(backdated.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildFamilyStages(
  family: FamilyNavigatorState,
  now: Date,
  language: Language = "en",
  nudgeFirstName?: string
): FamilyStage[] {
  const { profile } = family;
  if (!profile) {
    return [];
  }

  const stages: FamilyStage[] = [];

  if (isUnderThree(profile, now)) {
    pushStage(stages, "first-steps", "now", profile, language);
  }

  const completedMonths = childAgeMonths(profile, now);
  if (completedMonths !== null && completedMonths >= 18 && completedMonths <= 22) {
    pushStage(stages, "development-check-18-month", "now", profile, language);
  }
  if (completedMonths !== null && completedMonths >= 29 && completedMonths <= 34) {
    pushStage(stages, "development-check-30-month", "now", profile, language);
  }

  if (transitionWindowHasOpened(profile, now)) {
    pushStage(stages, "age-three-transition", "now", profile, language);
  }

  if (isInSchoolEnrollmentWindow(profile, now)) {
    pushStage(stages, "school-enrollment", "now", profile, language);
  }

  if (profile.diagnoses.length > 0) {
    const diagnosisMonth = mostRecentDiagnosisMonth(profile, now);
    pushStage(stages, "waiver-apply", "now", profile, language);

    if (diagnosedSchoolAge(profile)) {
      pushStage(stages, "school-arc", "now", profile, language);
    }

    pushStage(
      stages,
      "parent-connection",
      diagnosisMonth === null ? "next" : timingForDiagnosisOffset(diagnosisMonth, 1, now),
      profile,
      language
    );
    pushStage(
      stages,
      "sibling-respite",
      diagnosisMonth === null ? "later" : timingForDiagnosisOffset(diagnosisMonth, 3, now),
      profile,
      language
    );
  }

  if (hasReachedAge(profile, now, 14)) {
    pushStage(stages, "mission-transition", "now", profile, language);
  }

  if (isAgeSeventeen(profile, now)) {
    pushStage(stages, "before-eighteen", "now", profile, language);
  }

  for (const checkpoint of perinatalCheckpoints(profile, now)) {
    const id = `perinatal-check-${checkpoint.month}-month` as `perinatal-check-${PerinatalCheckpointMonth}-month`;
    pushStage(stages, id, checkpoint.timing, profile, language, nudgeFirstName);
  }

  const timingOrder: Record<FamilyStage["timing"], number> = { now: 0, next: 1, later: 2 };
  return stages.sort((left, right) => timingOrder[left.timing] - timingOrder[right.timing]);
}
