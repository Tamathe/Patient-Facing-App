import { PHQ9_INSTRUMENT } from "./phq9";
import type { ScreeningInstrument } from "./types";

export const INSTRUMENTS: Record<string, ScreeningInstrument> = {
  phq9: PHQ9_INSTRUMENT
};

export function getInstrument(id: string): ScreeningInstrument | undefined {
  return Object.prototype.hasOwnProperty.call(INSTRUMENTS, id) ? INSTRUMENTS[id] : undefined;
}

export function isKnownInstrument(id: string): boolean {
  return getInstrument(id) !== undefined;
}
