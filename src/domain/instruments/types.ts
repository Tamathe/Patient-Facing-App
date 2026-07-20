import type { Language } from "@/i18n/strings";
import type { AppState } from "../types";

export type ResponseOption = { value: number; en: string; es: string; score?: 0 | 1 };
export type ScreeningContext = { childAgeMonths?: number };
export type InstrumentCondition = {
  itemId: string;
  atLeast?: number;
  atMost?: number;
};
export type InstrumentItem = {
  id: string;
  kind: "choice" | "number" | "multi_choice";
  en: string;
  es: string;
  options?: ResponseOption[];
  min?: number;
  max?: number;
  integer?: boolean;
  allowEmpty?: boolean;
  crisisOnPositive?: boolean;
  conditionalOn?: InstrumentCondition;
  notApplicableValue?: number;
};
export type ScreeningOutcome = { totalScore: number; band: string };
export type ConsentCopy = Record<Language, { title: string; points: string[]; acknowledge: string }>;
export type ScreeningInstrument = {
  id: string;
  title: { en: string; es: string };
  briefLabel?: { en: string; es: string };
  instructions?: { en: string; es: string };
  audience: "self" | "caregiver" | "teen";
  tier: 0 | 1 | 2 | 3;
  items: InstrumentItem[];
  defaultOptions?: ResponseOption[];
  score: (responses: number[], context?: ScreeningContext) => ScreeningOutcome;
  bands: readonly string[];
  bandSummaries: Record<string, { en: string; es: string }>;
  consent: ConsentCopy;
  recurrenceDays?: number;
  eligibility?: (state: AppState, now: Date) => boolean;
  followUp?: { minScore: number; instrumentId: string };
  wordingVerified: boolean;
  licenseStatus: "clear" | "pending";
  attribution: { en: string; es: string };
};
