import type { Language } from "@/i18n/strings";
import type { AppState } from "../types";
import { TIER0_BATTERY } from "./battery";
import { getInstrument, INSTRUMENTS } from "./registry";
import type { ScreeningInstrument } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const BATTERY_RECURRENCE_DAYS = 90;
const NEUTRAL_CHECK_NAME: Record<Language, string> = {
  en: "quick health check",
  es: "chequeo rápido de salud"
};
const TIER0_IDS = new Set<string>(TIER0_BATTERY);

export type DueInstrument = {
  id: string;
  href: string;
  checkName: Record<Language, string>;
  instrumentIds: readonly string[];
  kind: "instrument" | "battery";
};

function latestQualifyingTimestamp(state: AppState, instrumentId: string, nowMs: number): number | undefined {
  return state.assessmentEvents.reduce<number | undefined>((latest, event) => {
    if (event.instrumentId !== instrumentId || getInstrument(event.instrumentId) === undefined) {
      return latest;
    }
    const recordedAtMs = new Date(event.recordedAt).valueOf();
    if (Number.isNaN(recordedAtMs) || recordedAtMs > nowMs) {
      return latest;
    }
    return latest === undefined || recordedAtMs > latest ? recordedAtMs : latest;
  }, undefined);
}

function isDue(state: AppState, instrument: ScreeningInstrument, now: Date, nowMs: number): boolean {
  if (
    instrument.recurrenceDays === undefined ||
    instrument.licenseStatus !== "clear" ||
    instrument.eligibility?.(state, now) === false
  ) {
    return false;
  }
  const latest = latestQualifyingTimestamp(state, instrument.id, nowMs);
  return latest === undefined || nowMs > latest + instrument.recurrenceDays * DAY_MS;
}

function instrumentCandidate(instrument: ScreeningInstrument): DueInstrument {
  return {
    id: instrument.id,
    href: `/checkin/${instrument.id}`,
    checkName: NEUTRAL_CHECK_NAME,
    instrumentIds: [instrument.id],
    kind: "instrument"
  };
}

function batteryIsDue(state: AppState, nowMs: number): boolean {
  const instruments = TIER0_BATTERY.map((instrumentId) => getInstrument(instrumentId));
  if (instruments.some((instrument) => instrument?.licenseStatus !== "clear")) {
    return false;
  }
  return TIER0_BATTERY.some((instrumentId) => {
    const latest = latestQualifyingTimestamp(state, instrumentId, nowMs);
    return latest === undefined || nowMs > latest + BATTERY_RECURRENCE_DAYS * DAY_MS;
  });
}

export function dueInstruments(state: AppState, now: Date): DueInstrument[] {
  const nowMs = now.valueOf();
  if (Number.isNaN(nowMs)) {
    return [];
  }

  const due: DueInstrument[] = [];
  const phq9 = getInstrument("phq9");
  if (phq9 && isDue(state, phq9, now, nowMs)) {
    due.push(instrumentCandidate(phq9));
  }
  if (batteryIsDue(state, nowMs)) {
    due.push({
      id: "tier0_battery",
      href: "/checkin/quick",
      checkName: NEUTRAL_CHECK_NAME,
      instrumentIds: TIER0_BATTERY,
      kind: "battery"
    });
  }

  for (const instrument of Object.values(INSTRUMENTS)) {
    if (instrument.id === "phq9" || TIER0_IDS.has(instrument.id) || !isDue(state, instrument, now, nowMs)) {
      continue;
    }
    due.push(instrumentCandidate(instrument));
  }
  return due;
}
