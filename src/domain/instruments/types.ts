import type { Language } from "@/i18n/strings";

export type ResponseOption = { value: number; en: string; es: string };
export type InstrumentItem = {
  id: string;
  kind: "choice" | "number";
  en: string;
  es: string;
  options?: ResponseOption[];
  min?: number;
  max?: number;
  crisisOnPositive?: boolean;
  conditionalOn?: { itemId: string; atLeast: number };
  notApplicableValue?: number;
};
export type ScreeningOutcome = { totalScore: number; band: string };
export type ConsentCopy = Record<Language, { title: string; points: string[]; acknowledge: string }>;
export type ScreeningInstrument = {
  id: string;
  title: { en: string; es: string };
  audience: "self" | "caregiver";
  tier: 0 | 1 | 2 | 3;
  items: InstrumentItem[];
  defaultOptions?: ResponseOption[];
  score: (responses: number[]) => ScreeningOutcome;
  bands: readonly string[];
  bandSummaries: Record<string, { en: string; es: string }>;
  consent: ConsentCopy;
  recurrenceDays?: number;
  followUp?: { minScore: number; instrumentId: string };
  wordingVerified: boolean;
  licenseStatus: "clear" | "pending";
  attribution: { en: string; es: string };
};
