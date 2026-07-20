import { toDateKey } from "./adherence";
import type { DoseEvent, DoseReminderPreference, ReminderPermission } from "./types";

export type { DoseReminderPreference, ReminderPermission } from "./types";

export const DEFAULT_DOSE_REMINDER: DoseReminderPreference = {
  enabled: false,
  timeLocal: "09:00",
  weekends: true,
  permission: "default"
};

const permissions: ReminderPermission[] = ["default", "granted", "denied", "unsupported"];
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isDoseReminderPreference(value: unknown): value is DoseReminderPreference {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.enabled === "boolean" &&
    typeof candidate.timeLocal === "string" &&
    timePattern.test(candidate.timeLocal) &&
    typeof candidate.weekends === "boolean" &&
    typeof candidate.permission === "string" &&
    permissions.some((permission) => permission === candidate.permission)
  );
}

export function reminderTimeForDate(preference: DoseReminderPreference, date: Date): Date | null {
  if (!preference.enabled || (!preference.weekends && (date.getDay() === 0 || date.getDay() === 6))) {
    return null;
  }

  const [hours, minutes] = preference.timeLocal.split(":").map((part) => Number.parseInt(part, 10));
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

export function isDoseReminderDue(
  preference: DoseReminderPreference,
  doseEvents: DoseEvent[],
  medicationId: string,
  now: Date
): boolean {
  const scheduled = reminderTimeForDate(preference, now);
  if (!scheduled || now.valueOf() < scheduled.valueOf()) {
    return false;
  }

  const dateKey = toDateKey(now);
  return !doseEvents.some((event) => event.medicationId === medicationId && event.date === dateKey);
}

export function nextReminderAt(preference: DoseReminderPreference, now: Date): Date | null {
  if (!preference.enabled) {
    return null;
  }

  for (let offset = 0; offset < 8; offset += 1) {
    const candidateDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    candidateDate.setDate(candidateDate.getDate() + offset);
    const scheduled = reminderTimeForDate(preference, candidateDate);
    if (scheduled && scheduled.valueOf() > now.valueOf()) {
      return scheduled;
    }
  }

  return null;
}
