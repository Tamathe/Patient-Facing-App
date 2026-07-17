import type { DevNeedDomain, FamilyNavigatorState, FamilyProfile } from "./types";

export type FamilyStage = {
  id: string;
  timing: "now" | "next" | "later";
  title: string;
  description: string;
  domains: DevNeedDomain[];
};

function ageInMonths(profile: FamilyProfile, now: Date): number | null {
  if (profile.birthMonth === undefined) {
    return null;
  }

  return (now.getUTCFullYear() - profile.birthYear) * 12 + (now.getUTCMonth() + 1 - profile.birthMonth);
}

function hasReachedAge(profile: FamilyProfile, now: Date, years: number): boolean {
  const months = ageInMonths(profile, now);
  return months === null ? now.getUTCFullYear() - profile.birthYear >= years : months >= years * 12;
}

function isUnderThree(profile: FamilyProfile, now: Date): boolean {
  const months = ageInMonths(profile, now);
  if (months !== null) {
    return months >= 0 && months < 36;
  }

  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  return calendarAge >= 0 && calendarAge <= 3;
}

function transitionWindowHasOpened(profile: FamilyProfile, now: Date): boolean {
  const months = ageInMonths(profile, now);
  if (months !== null) {
    return months >= 27 && months < 36;
  }

  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  return calendarAge === 2 || calendarAge === 3;
}

function isInSchoolEnrollmentWindow(profile: FamilyProfile, now: Date): boolean {
  const months = ageInMonths(profile, now);
  if (months !== null) {
    return months >= 48 && months < 72;
  }

  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  return calendarAge >= 4 && calendarAge <= 6;
}

function diagnosedSchoolAge(profile: FamilyProfile): boolean {
  return (
    profile.diagnoses.length > 0 &&
    profile.schoolStage !== "not_school_age" &&
    profile.schoolStage !== "preschool"
  );
}

export function buildFamilyStages(family: FamilyNavigatorState, now: Date): FamilyStage[] {
  const { profile } = family;
  if (!profile) {
    return [];
  }

  const stages: FamilyStage[] = [];

  if (isUnderThree(profile, now)) {
    stages.push({
      id: "first-steps",
      timing: "now",
      title: "Start First Steps before age three",
      description:
        "First Steps does not accept a new referral during the final 45 days before a child's third birthday, so contact the local point of entry early.",
      domains: ["early_intervention"]
    });
  }

  if (transitionWindowHasOpened(profile, now)) {
    stages.push({
      id: "age-three-transition",
      timing: "later",
      title: "Plan the transition before age three",
      description:
        "Ask for the transition conference and stay enrolled in First Steps so an eligible child can have an IEP in place by the third birthday.",
      domains: ["early_intervention", "school_iep"]
    });
  }

  if (isInSchoolEnrollmentWindow(profile, now)) {
    stages.push({
      id: "school-enrollment",
      timing: "now",
      title: "Prepare for school enrollment",
      description: "Learn Kentucky's ARC and IEP process before preschool or kindergarten enrollment.",
      domains: ["school_iep"]
    });
  }

  if (diagnosedSchoolAge(profile)) {
    stages.push(
      {
        id: "waiver-apply",
        timing: "now",
        title: "Start the Michelle P. Waiver application",
        description:
          "The Michelle P. waiting list is date ordered. Starting now establishes an earlier place while the state reviews the application.",
        domains: ["waivers_financial"]
      },
      {
        id: "school-arc",
        timing: "now",
        title: "Prepare for the school ARC meeting",
        description: "Gather the family's concerns and ask the school how to request an ARC meeting or IEP evaluation.",
        domains: ["school_iep"]
      },
      {
        id: "parent-connection",
        timing: "next",
        title: "Connect with another parent",
        description: "A parent group or peer mentor can help the family learn the next steps without navigating alone.",
        domains: ["parent_support"]
      },
      {
        id: "sibling-respite",
        timing: "later",
        title: "Explore sibling support and respite",
        description: "Look for honest local options for siblings and planned caregiving breaks.",
        domains: ["sibling_support", "respite"]
      }
    );
  }

  if (hasReachedAge(profile, now, 14)) {
    stages.push({
      id: "mission-transition",
      timing: "now",
      title: "Start transition planning",
      description: "Use the school ARC process and Kentucky transition resources to begin planning for adult life.",
      domains: ["future_planning"]
    });
  }

  if (hasReachedAge(profile, now, 17)) {
    stages.push({
      id: "before-eighteen",
      timing: "next",
      title: "Prepare for age eighteen",
      description:
        "Review SSI re-application, supported decision-making versus guardianship, and STABLE account options before age eighteen.",
      domains: ["future_planning"]
    });
  }

  const timingOrder: Record<FamilyStage["timing"], number> = { now: 0, next: 1, later: 2 };
  return stages.sort((left, right) => timingOrder[left.timing] - timingOrder[right.timing]);
}
