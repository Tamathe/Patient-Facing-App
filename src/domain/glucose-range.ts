import type { GlucoseReading } from "./types";

const MIN_READINGS = 5;
const DEFAULT_LOW = 70;
const DEFAULT_HIGH = 180;
const DEFAULT_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TimeInRange = {
  inRange: number;
  below: number;
  above: number;
  total: number;
  percentInRange: number;
  windowDays: number;
  low: number;
  high: number;
};

// Time-in-range over a trailing window, anchored to the most recent reading (not
// the wall clock) so the static demo renders regardless of when it is opened —
// the same wall-clock-agnostic posture as summarizeGlucoseTrend and the brief's
// recent-readings section. Pass `asOf` to pin the anchor in tests. Returns null
// below MIN_READINGS so a lone reading never renders "100% in range".
export function computeTimeInRange(
  readings: GlucoseReading[],
  options: { low?: number; high?: number; windowDays?: number; asOf?: Date | string | number } = {}
): TimeInRange | null {
  const low = options.low ?? DEFAULT_LOW;
  const high = options.high ?? DEFAULT_HIGH;
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;

  if (readings.length === 0) {
    return null;
  }

  const times = readings.map((reading) => new Date(reading.measuredAt).valueOf());
  const anchor = options.asOf !== undefined ? new Date(options.asOf).valueOf() : Math.max(...times);
  const windowStart = anchor - windowDays * DAY_MS;

  const windowed = readings.filter((reading) => {
    const time = new Date(reading.measuredAt).valueOf();
    return time > windowStart && time <= anchor;
  });

  if (windowed.length < MIN_READINGS) {
    return null;
  }

  let inRange = 0;
  let below = 0;
  let above = 0;
  for (const reading of windowed) {
    if (reading.valueMgDl < low) {
      below += 1;
    } else if (reading.valueMgDl > high) {
      above += 1;
    } else {
      inRange += 1;
    }
  }
  const total = windowed.length;

  return {
    inRange,
    below,
    above,
    total,
    percentInRange: Math.round((inRange / total) * 100),
    windowDays,
    low,
    high
  };
}
