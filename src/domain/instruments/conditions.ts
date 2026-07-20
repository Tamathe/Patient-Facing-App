import type { InstrumentCondition } from "./types";

export function conditionMatches(condition: InstrumentCondition, value: number | undefined): boolean {
  if (value === undefined || !Number.isFinite(value)) {
    return false;
  }
  return (condition.atLeast === undefined || value >= condition.atLeast) &&
    (condition.atMost === undefined || value <= condition.atMost);
}
