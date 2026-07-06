import { describe, expect, it } from "vitest";
import { brentState, demoState } from "./fixtures";
import { buildRefillGapDraft, getPdcToDate } from "./medication-fills";
import type { MedicationFill } from "./types";

const today = new Date("2026-07-06T12:00:00.000Z");

describe("getPdcToDate", () => {
  it("returns null when no fill classifies as a diabetes medication (Jordan)", () => {
    expect(getPdcToDate(demoState, today)).toBeNull();
  });

  it("computes an eligible below-threshold estimate for Brent's metformin fills", () => {
    const result = getPdcToDate(brentState, today);

    expect(result).not.toBeNull();
    expect(result?.eligible).toBe(true);
    expect(result?.meetsThreshold).toBe(false);
    expect(result?.pdcPercent).toBeGreaterThan(50);
    expect(result?.pdcPercent).toBeLessThan(80);
  });

  it("stays ineligible (no percent to show) when refill history is too thin", () => {
    const oneFill: MedicationFill = brentState.medicationFills[0];
    const result = getPdcToDate({ ...brentState, medicationFills: [oneFill] }, today);

    expect(result).not.toBeNull();
    expect(result?.eligible).toBe(false);
    expect(buildRefillGapDraft({ ...brentState, medicationFills: [oneFill] }, result!)).toBeNull();
  });

  it("shows the card but excludes insulin fills from scoring", () => {
    const insulinFill: MedicationFill = {
      id: "fill-insulin",
      patientId: brentState.patient.id,
      medicationId: "med-metformin",
      medicationName: "insulin glargine",
      dateOfService: "2026-02-01",
      daysSupply: 30,
      source: "patient_reported"
    };
    const result = getPdcToDate({ ...brentState, medicationFills: [insulinFill] }, today);

    expect(result).not.toBeNull();
    expect(result?.eligible).toBe(false);
    expect(result?.exclusionClaims.length).toBeGreaterThan(0);
  });
});

describe("buildRefillGapDraft", () => {
  it("embeds the PDC percent and recommends no treatment change", () => {
    const result = getPdcToDate(brentState, today);
    const draft = buildRefillGapDraft(brentState, result!);

    expect(draft).not.toBeNull();
    expect(draft?.draft).toContain(`${result?.pdcPercent}%`);
    expect(draft?.draft).not.toMatch(/increase your dose|stop taking|start taking|take \d+ mg/i);
  });
});
