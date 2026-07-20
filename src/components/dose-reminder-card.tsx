"use client";

import React, { useState } from "react";
import type { DoseReminderPreference, ReminderPermission } from "@/domain/types";

type DoseReminderCardProps = {
  preference: DoseReminderPreference;
  due: boolean;
  onChange: (preference: DoseReminderPreference) => void;
  onEnableNotifications: () => Promise<ReminderPermission> | ReminderPermission;
};

export function DoseReminderCard({
  preference,
  due,
  onChange,
  onEnableNotifications
}: DoseReminderCardProps) {
  const [requesting, setRequesting] = useState(false);

  async function setEnabled(enabled: boolean) {
    if (!enabled) {
      onChange({ ...preference, enabled: false });
      return;
    }

    setRequesting(true);
    const permission = await onEnableNotifications();
    onChange({ ...preference, enabled: true, permission });
    setRequesting(false);
  }

  return (
    <section className="rounded-control border border-ink/10 bg-white p-4">
      <p className="text-sm font-medium text-care">Medicine reminder</p>
      {due ? (
        <p className="mt-2 rounded-control bg-calm p-3 text-sm font-medium text-ink/85" role="status">
          Medicine reminder: open the medicine card above to mark today.
        </p>
      ) : null}

      <label className="mt-3 flex min-h-12 items-center gap-3 text-base font-semibold">
        <input
          checked={preference.enabled}
          disabled={requesting}
          onChange={(event) => void setEnabled(event.target.checked)}
          type="checkbox"
        />
        Remind me about my medicine
      </label>

      {preference.enabled ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink/80">
            Reminder time
            <input
              aria-label="Reminder time"
              className="mt-1 min-h-12 w-full rounded-control border border-ink/20 bg-white px-3"
              onChange={(event) => onChange({ ...preference, timeLocal: event.target.value })}
              type="time"
              value={preference.timeLocal}
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 self-end text-sm font-medium text-ink/80">
            <input
              checked={preference.weekends}
              onChange={(event) => onChange({ ...preference, weekends: event.target.checked })}
              type="checkbox"
            />
            Remind me on weekends
          </label>
        </div>
      ) : null}

      <p className="mt-3 text-sm leading-6 text-ink/70">
        Reminders appear only while this device and browser allow them. Keep using your usual medicine routine too.
      </p>
      {preference.enabled && preference.permission === "denied" ? (
        <p className="mt-2 text-sm font-medium text-alert">
          Notifications are blocked. You will still see the reminder here when you open Today.
        </p>
      ) : null}
      {preference.enabled && preference.permission === "unsupported" ? (
        <p className="mt-2 text-sm font-medium text-alert">
          This browser does not support notifications. You will still see the reminder here when you open Today.
        </p>
      ) : null}
    </section>
  );
}
