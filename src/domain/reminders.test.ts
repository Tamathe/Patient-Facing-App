import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOSE_REMINDER,
  isDoseReminderDue,
  isDoseReminderPreference,
  nextReminderAt,
  reminderTimeForDate,
  type DoseReminderPreference
} from "./reminders";
import type { DoseEvent } from "./types";

function preference(overrides: Partial<DoseReminderPreference> = {}): DoseReminderPreference {
  return { ...DEFAULT_DOSE_REMINDER, enabled: true, ...overrides };
}

function dose(date: string): DoseEvent {
  return {
    id: "dose-1",
    patientId: "patient-1",
    medicationId: "med-1",
    date,
    status: "taken",
    barrier: null,
    recordedAt: `${date}T08:00:00.000Z`
  };
}

describe("dose reminder rules", () => {
  it("validates a strict local time and permission", () => {
    expect(isDoseReminderPreference(DEFAULT_DOSE_REMINDER)).toBe(true);
    expect(isDoseReminderPreference({ ...DEFAULT_DOSE_REMINDER, timeLocal: "9:00" })).toBe(false);
    expect(isDoseReminderPreference({ ...DEFAULT_DOSE_REMINDER, timeLocal: "24:00" })).toBe(false);
    expect(isDoseReminderPreference({ ...DEFAULT_DOSE_REMINDER, permission: "maybe" })).toBe(false);
  });

  it("builds the scheduled time in the local calendar", () => {
    const scheduled = reminderTimeForDate(preference({ timeLocal: "09:15" }), new Date(2026, 6, 20, 7, 0));

    expect(scheduled).toEqual(new Date(2026, 6, 20, 9, 15));
  });

  it("is due at or after the time until the dose is logged", () => {
    const reminder = preference({ timeLocal: "09:00" });

    expect(isDoseReminderDue(reminder, [], "med-1", new Date(2026, 6, 20, 8, 59))).toBe(false);
    expect(isDoseReminderDue(reminder, [], "med-1", new Date(2026, 6, 20, 9, 0))).toBe(true);
    expect(isDoseReminderDue(reminder, [], "med-1", new Date(2026, 6, 20, 15, 0))).toBe(true);
    expect(isDoseReminderDue(reminder, [dose("2026-07-20")], "med-1", new Date(2026, 6, 20, 15, 0))).toBe(false);
  });

  it("skips weekends when weekend reminders are disabled", () => {
    const saturday = new Date(2026, 6, 18, 12, 0);
    const reminder = preference({ weekends: false });

    expect(reminderTimeForDate(reminder, saturday)).toBeNull();
    expect(isDoseReminderDue(reminder, [], "med-1", saturday)).toBe(false);
  });

  it("finds the next future reminder and skips a disabled weekend", () => {
    const reminder = preference({ timeLocal: "09:00", weekends: false });
    const fridayAfterReminder = new Date(2026, 6, 17, 10, 0);

    expect(nextReminderAt(reminder, fridayAfterReminder)).toEqual(new Date(2026, 6, 20, 9, 0));
  });

  it("returns null when reminders are disabled", () => {
    const disabled = { ...DEFAULT_DOSE_REMINDER, enabled: false };

    expect(reminderTimeForDate(disabled, new Date())).toBeNull();
    expect(nextReminderAt(disabled, new Date())).toBeNull();
  });
});
