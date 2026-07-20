import type { Language } from "@/i18n/strings";
import { PHQ9_INSTRUMENT } from "./instruments/phq9";

export type SeverityBand = "minimal" | "mild" | "moderate" | "moderately_severe" | "severe";

export type AssessmentEvent = {
  id: string;
  patientId: string;
  instrumentId: string;
  itemResponses: number[];
  totalScore: number;
  severityBand: string;
  status: "patient_reported";
  recordedAt: string;
};

export const PHQ9_ITEM_COUNT = PHQ9_INSTRUMENT.items.length;
export const PHQ9_MAX_SCORE = PHQ9_INSTRUMENT.score(
  PHQ9_INSTRUMENT.items.map(() => Math.max(...(PHQ9_INSTRUMENT.defaultOptions ?? []).map(({ value }) => value)))
).totalScore;
export const PHQ9_ITEMS = PHQ9_INSTRUMENT.items.map(({ id, en, es }) => ({ id, en, es }));
export const PHQ9_RESPONSE_OPTIONS = PHQ9_INSTRUMENT.defaultOptions ?? [];
export const PHQ9_CONSENT = PHQ9_INSTRUMENT.consent;

export function scorePhq9(itemResponses: number[]): { totalScore: number; severityBand: SeverityBand } {
  const { totalScore, band } = PHQ9_INSTRUMENT.score(itemResponses);
  return { totalScore, severityBand: band as SeverityBand };
}

export function phq9Item9IsPositive(itemResponses: number[]): boolean {
  return PHQ9_INSTRUMENT.items.some(
    (item, index) => item.crisisOnPositive === true && (itemResponses[index] ?? 0) > 0
  );
}

export function severityBandSummary(band: SeverityBand, language: Language): string {
  return PHQ9_INSTRUMENT.bandSummaries[band][language];
}
