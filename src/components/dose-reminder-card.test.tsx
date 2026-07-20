import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_DOSE_REMINDER } from "@/domain/reminders";
import type { ReminderPermission } from "@/domain/types";
import { DoseReminderCard } from "./dose-reminder-card";

describe("DoseReminderCard", () => {
  it("keeps reminders off until the patient opts in", () => {
    render(
      <DoseReminderCard
        preference={DEFAULT_DOSE_REMINDER}
        due={false}
        onChange={vi.fn()}
        onEnableNotifications={vi.fn()}
      />
    );

    expect(screen.getByRole("checkbox", { name: "Remind me about my medicine" })).not.toBeChecked();
    expect(screen.getByText(/only while this device and browser allow them/i)).toBeInTheDocument();
  });

  it("requests permission and saves the result when enabled", async () => {
    const onChange = vi.fn();
    const onEnableNotifications = vi.fn<() => Promise<ReminderPermission>>().mockResolvedValue("granted");
    render(
      <DoseReminderCard
        preference={DEFAULT_DOSE_REMINDER}
        due={false}
        onChange={onChange}
        onEnableNotifications={onEnableNotifications}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Remind me about my medicine" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        ...DEFAULT_DOSE_REMINDER,
        enabled: true,
        permission: "granted"
      });
    });
  });

  it("saves time and weekend changes", () => {
    const onChange = vi.fn();
    const preference = { ...DEFAULT_DOSE_REMINDER, enabled: true, permission: "granted" as const };
    render(
      <DoseReminderCard
        preference={preference}
        due={false}
        onChange={onChange}
        onEnableNotifications={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Reminder time"), { target: { value: "08:15" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Remind me on weekends" }));

    expect(onChange).toHaveBeenCalledWith({ ...preference, timeLocal: "08:15" });
    expect(onChange).toHaveBeenCalledWith({ ...preference, weekends: false });
  });

  it("shows a due prompt and a browser fallback", () => {
    render(
      <DoseReminderCard
        preference={{ ...DEFAULT_DOSE_REMINDER, enabled: true, permission: "denied" }}
        due
        onChange={vi.fn()}
        onEnableNotifications={vi.fn()}
      />
    );

    expect(screen.getByText(/open the medicine card above to mark today/i)).toBeInTheDocument();
    expect(screen.getByText(/notifications are blocked/i)).toBeInTheDocument();
  });
});
