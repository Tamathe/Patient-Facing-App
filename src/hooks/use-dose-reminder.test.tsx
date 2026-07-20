import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DOSE_REMINDER } from "@/domain/reminders";
import type { DoseEvent } from "@/domain/types";
import { useDoseReminder } from "./use-dose-reminder";

const mondayMorning = new Date(2026, 6, 20, 9, 5, 0, 0);

function dose(): DoseEvent {
  return {
    id: "dose-1",
    patientId: "patient-1",
    medicationId: "med-1",
    date: "2026-07-20",
    status: "taken",
    barrier: null,
    recordedAt: mondayMorning.toISOString()
  };
}

describe("useDoseReminder", () => {
  const showNotification = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    window.localStorage.clear();
    showNotification.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(mondayMorning);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { ready: Promise.resolve({ showNotification }) }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("requests browser permission only when called", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    const { result } = renderHook(() =>
      useDoseReminder({ preference: DEFAULT_DOSE_REMINDER, doseEvents: [], medicationId: "med-1" })
    );

    expect(requestPermission).not.toHaveBeenCalled();
    await expect(result.current.requestPermission()).resolves.toBe("granted");
    expect(requestPermission).toHaveBeenCalledOnce();
  });

  it("returns unsupported when notifications are unavailable", async () => {
    vi.stubGlobal("Notification", undefined);
    const { result } = renderHook(() =>
      useDoseReminder({ preference: DEFAULT_DOSE_REMINDER, doseEvents: [], medicationId: "med-1" })
    );

    await expect(result.current.requestPermission()).resolves.toBe("unsupported");
  });

  it("shows one generic notification when an unlogged dose is due", async () => {
    vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn() });
    renderHook(() =>
      useDoseReminder({
        preference: { ...DEFAULT_DOSE_REMINDER, enabled: true, permission: "granted" },
        doseEvents: [],
        medicationId: "med-1"
      })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(showNotification).toHaveBeenCalledOnce();
    expect(showNotification).toHaveBeenCalledWith(
      "Medicine reminder",
      expect.objectContaining({ body: "Open Today to check your medicine.", tag: "dose-reminder-med-1" })
    );
  });

  it("does not notify after the dose is logged", async () => {
    vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn() });
    renderHook(() =>
      useDoseReminder({
        preference: { ...DEFAULT_DOSE_REMINDER, enabled: true, permission: "granted" },
        doseEvents: [dose()],
        medicationId: "med-1"
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(showNotification).not.toHaveBeenCalled();
  });
});
