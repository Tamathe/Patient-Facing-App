import type { DoseEvent, GlucoseReading, HomeReading } from "./types";

const MIN_TREND_READINGS = 5;
const GLUCOSE_TREND_DELTA = 10;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + deltaDays);
  return toDateKey(date);
}

export function getDoseForDate(
  doseEvents: DoseEvent[],
  medicationId: string,
  dateKey: string
): DoseEvent | undefined {
  return doseEvents.find((event) => event.medicationId === medicationId && event.date === dateKey);
}

export function getAdherenceStreak(doseEvents: DoseEvent[], medicationId: string, today: Date): number {
  const takenDates = new Set(
    doseEvents
      .filter((event) => event.medicationId === medicationId && event.status === "taken")
      .map((event) => event.date)
  );
  const todayKey = toDateKey(today);
  // An as-yet-unlogged today should not zero out the streak, so start counting from yesterday in that case.
  let cursor = takenDates.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  let streak = 0;
  while (takenDates.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function getAdherenceRate(
  doseEvents: DoseEvent[],
  medicationId: string,
  days: number,
  today: Date
): { taken: number; of: number } {
  const todayKey = toDateKey(today);
  const window = new Set<string>();
  for (let offset = 0; offset < days; offset += 1) {
    window.add(shiftDateKey(todayKey, -offset));
  }
  const takenDays = new Set(
    doseEvents
      .filter(
        (event) => event.medicationId === medicationId && event.status === "taken" && window.has(event.date)
      )
      .map((event) => event.date)
  );
  return { taken: takenDays.size, of: days };
}

// A minimal trend shape both BpTrend and GlucoseTrend satisfy, so a shared card
// (DoseCard) can render either without a discriminated union.
export type TrendSummary = { direction: string; message: string };

export type BpTrend = {
  direction: "improving" | "steady" | "rising";
  message: string;
};

export type GlucoseTrend = {
  direction: "improving" | "steady" | "rising";
  message: string;
};

export function summarizeBpTrend(readings: HomeReading[]): BpTrend | null {
  if (readings.length < MIN_TREND_READINGS) {
    return null;
  }

  const ordered = [...readings].sort(
    (left, right) => new Date(left.measuredAt).valueOf() - new Date(right.measuredAt).valueOf()
  );
  const half = Math.floor(ordered.length / 2);
  const earlier = ordered.slice(0, half);
  const recent = ordered.slice(ordered.length - half);
  const average = (items: HomeReading[]) => items.reduce((sum, reading) => sum + reading.systolic, 0) / items.length;
  const delta = Math.round(average(recent) - average(earlier));

  if (delta <= -3) {
    return {
      direction: "improving",
      message: `Your recent top numbers average about ${Math.abs(delta)} points lower than when you started tracking — a sign your plan is helping. This is general education, not a diagnosis.`
    };
  }

  if (delta >= 3) {
    return {
      direction: "rising",
      message: `Your recent top numbers average about ${delta} points higher than earlier readings. Keep logging and bring this to your care team. This is general education, not a diagnosis.`
    };
  }

  return {
    direction: "steady",
    message: "Your recent top numbers are holding steady compared with earlier readings. Keep logging so your care team can see the pattern."
  };
}

// Mirrors summarizeBpTrend for blood sugar. mg/dL swings wider than blood
// pressure, so the improving/rising band is ±10 mg/dL rather than ±3 points.
// Rising glucose is bad (same polarity as blood pressure).
export function summarizeGlucoseTrend(readings: GlucoseReading[]): GlucoseTrend | null {
  if (readings.length < MIN_TREND_READINGS) {
    return null;
  }

  const ordered = [...readings].sort(
    (left, right) => new Date(left.measuredAt).valueOf() - new Date(right.measuredAt).valueOf()
  );
  const half = Math.floor(ordered.length / 2);
  const earlier = ordered.slice(0, half);
  const recent = ordered.slice(ordered.length - half);
  const average = (items: GlucoseReading[]) => items.reduce((sum, reading) => sum + reading.valueMgDl, 0) / items.length;
  const delta = Math.round(average(recent) - average(earlier));

  if (delta <= -GLUCOSE_TREND_DELTA) {
    return {
      direction: "improving",
      message: `Your recent blood-sugar numbers average about ${Math.abs(delta)} mg/dL lower than when you started tracking — a sign your plan is helping. This is general education, not a diagnosis.`
    };
  }

  if (delta >= GLUCOSE_TREND_DELTA) {
    return {
      direction: "rising",
      message: `Your recent blood-sugar numbers average about ${delta} mg/dL higher than earlier readings. Keep logging and bring this to your care team. This is general education, not a diagnosis.`
    };
  }

  return {
    direction: "steady",
    message: "Your recent blood-sugar numbers are holding steady compared with earlier readings. Keep logging so your care team can see the pattern."
  };
}
