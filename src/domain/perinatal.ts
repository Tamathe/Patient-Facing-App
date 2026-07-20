import type { FamilyProfile } from "./types";

export type PerinatalCheckpointMonth = 1 | 2 | 4 | 6;

export type PerinatalCheckpoint = {
  month: PerinatalCheckpointMonth;
  timing: "now" | "next" | "later";
};

const CHECKPOINT_MONTHS: PerinatalCheckpointMonth[] = [1, 2, 4, 6];

export function perinatalCheckpoints(
  profile: FamilyProfile | null | undefined,
  now: Date
): PerinatalCheckpoint[] {
  const birthMonth = profile?.birthMonth;
  if (
    !profile ||
    !Number.isFinite(now.valueOf()) ||
    !Number.isInteger(profile.birthYear) ||
    birthMonth === undefined ||
    !Number.isInteger(birthMonth) ||
    birthMonth < 1 ||
    birthMonth > 12
  ) {
    return [];
  }

  const ageMonths =
    (now.getUTCFullYear() - profile.birthYear) * 12 +
    (now.getUTCMonth() + 1 - birthMonth);
  if (ageMonths < 0 || ageMonths > 6) {
    return [];
  }

  return CHECKPOINT_MONTHS.filter((month) => month >= ageMonths).map((month) => {
    const monthsUntil = month - ageMonths;
    return {
      month,
      timing: monthsUntil === 0 ? "now" : monthsUntil === 1 ? "next" : "later"
    };
  });
}
