import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { demoState } from "@/domain/fixtures";
import { HealthStateProvider, useHealthState } from "./store";

vi.mock("./storage", () => ({
  isLanguage: (value: unknown) => value === "en" || value === "es",
  loadStoredState: () => demoState,
  saveStoredState: vi.fn()
}));

Object.assign(globalThis, { React });

function PatientName() {
  const { state } = useHealthState();

  return <span>{state.patient.preferredName}</span>;
}

describe("HealthStateProvider hydration", () => {
  it("uses the deterministic demo state for the server render", () => {
    const html = renderToString(
      <HealthStateProvider>
        <PatientName />
      </HealthStateProvider>
    );

    expect(html).toContain("Brent");
    expect(html).not.toContain("Jordan");
  });
});
