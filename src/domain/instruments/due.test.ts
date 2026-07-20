import { describe, expect, it } from "vitest";
import type { AssessmentEvent } from "../assessment";
import { demoState } from "../fixtures";
import type { AppState } from "../types";
import { TIER0_BATTERY } from "./battery";
import { dueInstruments } from "./due";
import { DDS2_INSTRUMENT } from "./dds2";
import { getInstrument } from "./registry";

const NOW = new Date("2026-07-20T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function event(instrumentId: string, recordedAt: string, overrides: Partial<AssessmentEvent> = {}): AssessmentEvent {
  return {
    id: `${instrumentId}-${recordedAt}`,
    patientId: demoState.patient.id,
    instrumentId,
    itemResponses: [0],
    totalScore: 0,
    severityBand: "negative",
    status: "patient_reported",
    recordedAt,
    ...overrides
  };
}

function stateWith(assessmentEvents: AssessmentEvent[]): AppState {
  return { ...demoState, assessmentEvents, screeningGaps: [] };
}

function setBatteryLicenses(status: "clear" | "pending"): Map<string, "clear" | "pending"> {
  const originals = new Map<string, "clear" | "pending">();
  for (const instrumentId of TIER0_BATTERY) {
    const instrument = getInstrument(instrumentId);
    if (!instrument) {
      throw new Error(`Missing battery instrument: ${instrumentId}`);
    }
    originals.set(instrumentId, instrument.licenseStatus);
    instrument.licenseStatus = status;
  }
  return originals;
}

function restoreBatteryLicenses(originals: Map<string, "clear" | "pending">): void {
  for (const [instrumentId, licenseStatus] of originals) {
    const instrument = getInstrument(instrumentId);
    if (instrument) {
      instrument.licenseStatus = licenseStatus;
    }
  }
}

describe("dueInstruments", () => {
  it("returns PHQ-9 first and eligible recurring registry instruments in stable order", () => {
    expect(dueInstruments(stateWith([]), NOW).map(({ id }) => id)).toEqual([
      "phq9",
      "crc_eligibility",
      "prediabetes_risk",
      "audit_c",
      "dds2"
    ]);
  });

  it("treats the exact recurrence boundary as current and one millisecond later as due", () => {
    const atBoundary = new Date(NOW.valueOf() - 14 * DAY_MS).toISOString();
    const oneMillisecondPast = new Date(NOW.valueOf() - 14 * DAY_MS - 1).toISOString();

    expect(dueInstruments(stateWith([event("phq9", atBoundary)]), NOW).map(({ id }) => id)).not.toContain("phq9");
    expect(dueInstruments(stateWith([event("phq9", oneMillisecondPast)]), NOW).map(({ id }) => id)).toContain("phq9");
  });

  it("uses the newest qualifying event independent of event-array order", () => {
    const recent = event("phq9", "2026-07-19T12:00:00.000Z", { id: "recent" });
    const stale = event("phq9", "2026-01-01T12:00:00.000Z", { id: "stale" });

    expect(dueInstruments(stateWith([recent, stale]), NOW).map(({ id }) => id)).not.toContain("phq9");
  });

  it("ignores invalid, future-dated, and unknown rows", () => {
    const rows = [
      event("phq9", "not-a-date", { id: "invalid" }),
      event("phq9", "2026-07-21T12:00:00.000Z", { id: "future" }),
      event("unknown_instrument", "2026-07-20T11:00:00.000Z", { id: "unknown" })
    ];

    expect(dueInstruments(stateWith(rows), NOW).map(({ id }) => id)).toContain("phq9");
  });

  it("suppresses the synthetic battery while any component license is pending", () => {
    expect(dueInstruments(stateWith([]), NOW).map(({ id }) => id)).not.toContain("tier0_battery");
  });

  it("keeps a clear-license battery due after partial completion", () => {
    const originals = setBatteryLicenses("clear");
    try {
      const due = dueInstruments(stateWith([event("phq2", "2026-07-19T12:00:00.000Z")]), NOW);
      expect(due[1]).toMatchObject({
        id: "tier0_battery",
        href: "/checkin/quick",
        instrumentIds: TIER0_BATTERY,
        kind: "battery"
      });
    } finally {
      restoreBatteryLicenses(originals);
    }
  });

  it("keeps an all-five battery current only while every component is fresh", () => {
    const originals = setBatteryLicenses("clear");
    try {
      const freshEvents = TIER0_BATTERY.map((instrumentId) => event(instrumentId, "2026-07-19T12:00:00.000Z"));
      expect(dueInstruments(stateWith(freshEvents), NOW).map(({ id }) => id)).not.toContain("tier0_battery");

      const oneStale = freshEvents.map((row, index) =>
        index === 2 ? { ...row, recordedAt: new Date(NOW.valueOf() - 90 * DAY_MS - 1).toISOString() } : row
      );
      expect(dueInstruments(stateWith(oneStale), NOW).map(({ id }) => id)).toContain("tier0_battery");
    } finally {
      restoreBatteryLicenses(originals);
    }
  });

  it("uses the exact 90-day boundary for the synthetic battery", () => {
    const originals = setBatteryLicenses("clear");
    try {
      const boundary = new Date(NOW.valueOf() - 90 * DAY_MS).toISOString();
      const events = TIER0_BATTERY.map((instrumentId) => event(instrumentId, boundary));
      expect(dueInstruments(stateWith(events), NOW).map(({ id }) => id)).not.toContain("tier0_battery");

      events[0] = { ...events[0], recordedAt: new Date(NOW.valueOf() - 90 * DAY_MS - 1).toISOString() };
      expect(dueInstruments(stateWith(events), NOW).map(({ id }) => id)).toContain("tier0_battery");
    } finally {
      restoreBatteryLicenses(originals);
    }
  });

  it("uses the exact 365-day boundary for recurring adult instruments", () => {
    const boundary = event("audit_c", new Date(NOW.valueOf() - 365 * DAY_MS).toISOString());
    expect(dueInstruments(stateWith([boundary]), NOW).map(({ id }) => id)).not.toContain("audit_c");

    const stale = { ...boundary, recordedAt: new Date(NOW.valueOf() - 365 * DAY_MS - 1).toISOString() };
    expect(dueInstruments(stateWith([stale]), NOW).map(({ id }) => id)).toContain("audit_c");
  });

  it("applies registry eligibility to lung and STEADI candidates", () => {
    expect(dueInstruments(stateWith([]), NOW).map(({ id }) => id)).not.toContain("lung_ldct_eligibility");
    expect(dueInstruments(stateWith([]), NOW).map(({ id }) => id)).not.toContain("steadi3");

    const tobacco = event("tobacco_use", "2026-07-19T12:00:00.000Z", {
      itemResponses: [2, -1],
      severityBand: "current"
    });
    const age = event("crc_eligibility", "2026-07-19T12:00:00.000Z", {
      itemResponses: [65, 0, 0, 0, 0, 0],
      severityBand: "due"
    });
    const ids = dueInstruments(stateWith([tobacco, age]), NOW).map(({ id }) => id);

    expect(ids).toContain("lung_ldct_eligibility");
    expect(ids).toContain("steadi3");
  });

  it("excludes a recurring instrument while its license is pending", () => {
    const original = DDS2_INSTRUMENT.licenseStatus;
    DDS2_INSTRUMENT.licenseStatus = "pending";
    try {
      expect(dueInstruments(stateWith([]), NOW).map(({ id }) => id)).not.toContain("dds2");
    } finally {
      DDS2_INSTRUMENT.licenseStatus = original;
    }
  });
});
