import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlucoseReadingRow } from "./glucose-reading-row";
import type { GlucoseReading } from "@/domain/types";

const reading: GlucoseReading = {
  id: "glucose-row",
  patientId: "patient-test",
  valueMgDl: 152,
  measuredAt: "2026-07-04T07:05:00.000Z",
  contexts: ["morning"],
  note: ""
};

describe("GlucoseReadingRow", () => {
  it("renders a taken dose-log tag", () => {
    render(<GlucoseReadingRow reading={reading} status="taken" medNames={["Metformin"]} />);

    expect(screen.getByText("152 mg/dL")).toBeInTheDocument();
    expect(screen.getByText("Metformin taken")).toBeInTheDocument();
  });

  it("renders a missed dose-log tag", () => {
    render(<GlucoseReadingRow reading={reading} status="missed" medNames={["Metformin"]} />);

    expect(screen.getByText("Metformin missed")).toBeInTheDocument();
  });

  it("does not render a tag when dose-log status is unknown", () => {
    render(<GlucoseReadingRow reading={reading} status="unknown" medNames={[]} />);

    expect(screen.getByText("152 mg/dL")).toBeInTheDocument();
    expect(screen.queryByText(/Metformin/)).not.toBeInTheDocument();
  });
});
