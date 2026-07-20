import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DoseEvent, Medication } from "@/domain/types";
import { DoseCard } from "./dose-card";

const medication: Medication = {
  id: "med-1",
  patientId: "patient-1",
  name: "Lisinopril",
  dose: "10 mg",
  schedule: "Once daily",
  purpose: "Helps lower blood pressure.",
  preventionBenefit: "Lowers the chance of stroke.",
  safetyNote: "Do not change the dose without your clinician.",
  source: "patient_reported",
  activeBarriers: []
};

function noop() {
  // intentionally empty
}

function dose(overrides: Partial<DoseEvent> = {}): DoseEvent {
  return {
    id: "d1",
    patientId: "patient-1",
    medicationId: "med-1",
    date: "2026-07-05",
    status: "taken",
    barrier: null,
    recordedAt: "2026-07-05T08:00:00.000Z",
    ...overrides
  };
}

describe("DoseCard", () => {
  it("offers take and skip when today's dose is not logged", () => {
    render(
      <DoseCard
        medication={medication}
        todayDose={undefined}
        streak={2}
        rate={{ taken: 4, of: 7 }}
        readingCount={2}
        trend={null}
        onTake={noop}
        onSkip={noop}
        onUndo={noop}
      />
    );

    expect(screen.getByRole("button", { name: "I took it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I skipped it" })).toBeInTheDocument();
    expect(screen.getByText(/2-day streak/)).toBeInTheDocument();
    expect(screen.getByText("Taken 4 of the last 7 days.")).toBeInTheDocument();
    expect(screen.getByText("Log 3 more readings to see a pattern.")).toBeInTheDocument();
  });

  it("calls onTake when the patient marks it taken", () => {
    const onTake = vi.fn();
    render(
      <DoseCard
        medication={medication}
        todayDose={undefined}
        streak={0}
        rate={{ taken: 0, of: 7 }}
        readingCount={0}
        trend={null}
        onTake={onTake}
        onSkip={noop}
        onUndo={noop}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "I took it" }));

    expect(onTake).toHaveBeenCalledOnce();
  });

  it("captures a barrier reason when skipping", () => {
    const onSkip = vi.fn();
    render(
      <DoseCard
        medication={medication}
        todayDose={undefined}
        streak={0}
        rate={{ taken: 0, of: 7 }}
        readingCount={0}
        trend={null}
        onTake={noop}
        onSkip={onSkip}
        onUndo={noop}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "I skipped it" }));
    fireEvent.click(screen.getByRole("button", { name: "Feels side effects" }));

    expect(onSkip).toHaveBeenCalledWith("side_effects");
  });

  it("shows a confirmation and undo when already taken", () => {
    render(
      <DoseCard
        medication={medication}
        todayDose={dose({ status: "taken" })}
        streak={3}
        rate={{ taken: 3, of: 7 }}
        readingCount={5}
        trend={null}
        onTake={noop}
        onSkip={noop}
        onUndo={noop}
      />
    );

    expect(screen.getByText(/Taken today/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("shows the barrier and a help link when skipped", () => {
    render(
      <DoseCard
        medication={medication}
        todayDose={dose({ status: "skipped", barrier: "side_effects" })}
        streak={0}
        rate={{ taken: 0, of: 7 }}
        readingCount={0}
        trend={null}
        onTake={noop}
        onSkip={noop}
        onUndo={noop}
      />
    );

    expect(screen.getByText(/Feels side effects/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get help with side effects" })).toHaveAttribute(
      "href",
      expect.stringContaining("mode=trouble")
    );
  });

  it("explains why the medicine matters when the patient doubts it is needed", () => {
    render(
      <DoseCard
        medication={medication}
        todayDose={dose({ status: "skipped", barrier: "does_not_feel_necessary" })}
        streak={0}
        rate={{ taken: 0, of: 7 }}
        readingCount={1}
        trend={null}
        onTake={noop}
        onSkip={noop}
        onUndo={noop}
      />
    );

    expect(screen.getByText(/Helps lower blood pressure/)).toBeInTheDocument();
    expect(screen.getByText(/Lowers the chance of stroke/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Why it matters" })).toHaveAttribute(
      "href",
      expect.stringContaining("mode=why")
    );
  });

  it("renders the working trend when provided", () => {
    render(
      <DoseCard
        medication={medication}
        todayDose={undefined}
        streak={0}
        rate={{ taken: 4, of: 7 }}
        readingCount={5}
        trend={{ direction: "improving", message: "Your recent top numbers average about 20 points lower." }}
        onTake={noop}
        onSkip={noop}
        onUndo={noop}
      />
    );

    expect(screen.getByText(/Is it working/)).toBeInTheDocument();
    expect(screen.getByText(/20 points lower/)).toBeInTheDocument();
    expect(screen.queryByText(/more readings to see a pattern/)).not.toBeInTheDocument();
  });
});
