import { GAD2_INSTRUMENT } from "./gad2";
import { GAD7_INSTRUMENT } from "./gad7";
import { HUNGER_VITAL_SIGN_INSTRUMENT } from "./hunger-vital-sign";
import { NIDA_SINGLE_INSTRUMENT } from "./nida-single";
import { PHQ2_INSTRUMENT } from "./phq2";
import { PHQ9_INSTRUMENT } from "./phq9";
import { TOBACCO_USE_INSTRUMENT } from "./tobacco-use";
import type { ScreeningInstrument } from "./types";

export const INSTRUMENTS: Record<string, ScreeningInstrument> = {
  phq9: PHQ9_INSTRUMENT,
  phq2: PHQ2_INSTRUMENT,
  gad2: GAD2_INSTRUMENT,
  gad7: GAD7_INSTRUMENT,
  hunger_vital_sign: HUNGER_VITAL_SIGN_INSTRUMENT,
  tobacco_use: TOBACCO_USE_INSTRUMENT,
  nida_single: NIDA_SINGLE_INSTRUMENT
};

export function getInstrument(id: string): ScreeningInstrument | undefined {
  return Object.prototype.hasOwnProperty.call(INSTRUMENTS, id) ? INSTRUMENTS[id] : undefined;
}

export function isKnownInstrument(id: string): boolean {
  return getInstrument(id) !== undefined;
}
