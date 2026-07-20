"use client";

import { useCallback, useEffect } from "react";
import { isDoseReminderDue, nextReminderAt } from "@/domain/reminders";
import { toDateKey } from "@/domain/adherence";
import type { DoseEvent, DoseReminderPreference, ReminderPermission } from "@/domain/types";

type UseDoseReminderOptions = {
  preference: DoseReminderPreference;
  doseEvents: DoseEvent[];
  medicationId: string | null;
};

function notificationKey(medicationId: string, date: Date): string {
  return `dose-reminder-notified:${medicationId}:${toDateKey(date)}`;
}

function wasNotified(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function markNotified(key: string): void {
  try {
    window.localStorage.setItem(key, "true");
  } catch {
  }
}

async function showDoseNotification(medicationId: string): Promise<void> {
  const options: NotificationOptions = {
    body: "Open Today to check your medicine.",
    tag: `dose-reminder-${medicationId}`,
    data: { url: "/today" }
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Medicine reminder", options);
    return;
  }

  new Notification("Medicine reminder", options);
}

export function useDoseReminder({ preference, doseEvents, medicationId }: UseDoseReminderOptions) {
  const requestPermission = useCallback(async (): Promise<ReminderPermission> => {
    if (typeof Notification === "undefined") {
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted" || permission === "denied" ? permission : "default";
    } catch {
      return "denied";
    }
  }, []);

  useEffect(() => {
    if (!preference.enabled || preference.permission !== "granted" || !medicationId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function notifyIfDue(date: Date) {
      if (
        cancelled ||
        !medicationId ||
        !isDoseReminderDue(preference, doseEvents, medicationId, date)
      ) {
        return;
      }

      const key = notificationKey(medicationId, date);
      if (wasNotified(key)) {
        return;
      }

      try {
        await showDoseNotification(medicationId);
        markNotified(key);
      } catch {
      }
    }

    function scheduleNext(date: Date) {
      const next = nextReminderAt(preference, date);
      if (!next || cancelled) {
        return;
      }

      timer = setTimeout(() => {
        const current = new Date();
        void notifyIfDue(current).finally(() => scheduleNext(new Date()));
      }, Math.max(0, next.valueOf() - date.valueOf()));
    }

    const current = new Date();
    void notifyIfDue(current);
    scheduleNext(current);

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [doseEvents, medicationId, preference]);

  return { requestPermission };
}
