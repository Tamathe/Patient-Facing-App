import { getInstrument } from "./instruments/registry";
import type { FamilyProfile } from "./types";

export type FamilyScreeningEntry = {
  routeId: "swyc_18mo" | "swyc_30mo" | "psc17" | "phq_a";
  instrumentIds: readonly string[];
  minAgeMonths: number;
  maxAgeMonths: number;
  exposure: "hub" | "hub_preview";
};

const FAMILY_SCREENINGS: ReadonlyArray<Omit<FamilyScreeningEntry, "exposure">> = [
  { routeId: "swyc_18mo", instrumentIds: ["swyc_18mo", "swyc_posi"], minAgeMonths: 18, maxAgeMonths: 22 },
  { routeId: "swyc_30mo", instrumentIds: ["swyc_30mo", "swyc_posi"], minAgeMonths: 29, maxAgeMonths: 34 },
  { routeId: "psc17", instrumentIds: ["psc17"], minAgeMonths: 48, maxAgeMonths: 215 },
  { routeId: "phq_a", instrumentIds: ["phq_a"], minAgeMonths: 132, maxAgeMonths: 215 }
];

export function childAgeMonths(profile: FamilyProfile, now: Date): number | null {
  if (profile.birthMonth === undefined || Number.isNaN(now.valueOf())) {
    return null;
  }
  return (now.getUTCFullYear() - profile.birthYear) * 12 + now.getUTCMonth() + 1 - profile.birthMonth;
}

export function familyScreeningEntries(profile: FamilyProfile, now: Date): FamilyScreeningEntry[] {
  const age = childAgeMonths(profile, now);
  if (age === null) {
    return [];
  }

  return FAMILY_SCREENINGS.filter(({ minAgeMonths, maxAgeMonths }) => age >= minAgeMonths && age <= maxAgeMonths)
    .flatMap((entry) => {
      const instruments = entry.instrumentIds.map((instrumentId) => getInstrument(instrumentId));
      if (instruments.some((instrument) => instrument === undefined)) {
        return [];
      }
      const exposure = instruments.every((instrument) => instrument?.licenseStatus === "clear")
        ? "hub" as const
        : "hub_preview" as const;
      return [{ ...entry, exposure }];
    });
}
