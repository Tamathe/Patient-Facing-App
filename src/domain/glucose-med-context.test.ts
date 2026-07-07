import { describe, expect, it } from "vitest";
import { brentState } from "./fixtures";
import { annotateGlucoseWithMedContext } from "./glucose-med-context";
import type { DoseEvent, GlucoseReading, Medication } from "./types";

const lisinopril: Medication = {
  id: "med-lisinopril-only",
  patientId: "patient-test",
  name: "Lisinopril",
  dose: "10 mg",
  schedule: "Once daily",
  purpose: "Blood pressure",
  preventionBenefit: "Blood pressure control",
  safetyNote: "Follow your care plan.",
  source: "imported",
  activeBarriers: []
};

const metformin: Medication = {
  ...lisinopril,
  id: "med-metformin-test",
  name: "Metformin"
};

const reading: GlucoseReading = {
  id: "glucose-test",
  patientId: "patient-test",
  valueMgDl: 145,
  measuredAt: "2026-07-02T13:30:00.000Z",
  contexts: ["after_medicine"],
  note: ""
};

describe("annotateGlucoseWithMedContext", () => {
  it("labels Brent readings from the dose log without causal claims", () => {
    const readings = brentState.glucoseReadings.filter((item) =>
      ["glucose-brent-1", "glucose-brent-4", "glucose-brent-6"].includes(item.id)
    );
    const doseEventsWithoutJuly2Metformin = brentState.doseEvents.filter(
      (event) => !(event.medicationId === "med-metformin" && event.date === "2026-07-02")
    );

    const contexts = annotateGlucoseWithMedContext(readings, doseEventsWithoutJuly2Metformin, brentState.medications);

    expect(contexts).toEqual([
      { reading: readings[0], status: "missed", medNames: ["Metformin"] },
      { reading: readings[1], status: "unknown", medNames: [] },
      { reading: readings[2], status: "taken", medNames: ["Metformin"] }
    ]);
  });

  it("ignores non-diabetes medication dose events", () => {
    const contexts = annotateGlucoseWithMedContext(
      [reading],
      [
        {
          id: "dose-lisinopril",
          patientId: "patient-test",
          medicationId: lisinopril.id,
          date: "2026-07-02",
          status: "taken",
          barrier: null,
          recordedAt: "2026-07-02T08:00:00.000Z"
        }
      ],
      [lisinopril]
    );

    expect(contexts).toEqual([{ reading, status: "unknown", medNames: [] }]);
  });

  it("treats missing dose logs as unknown", () => {
    const contexts = annotateGlucoseWithMedContext([reading], [], [metformin]);

    expect(contexts).toEqual([{ reading, status: "unknown", medNames: [] }]);
  });

  it("uses missed when any diabetes dose that day was skipped", () => {
    const doseEvents: DoseEvent[] = [
      {
        id: "dose-metformin-taken",
        patientId: "patient-test",
        medicationId: metformin.id,
        date: "2026-07-02",
        status: "taken",
        barrier: null,
        recordedAt: "2026-07-02T08:00:00.000Z"
      },
      {
        id: "dose-metformin-skipped",
        patientId: "patient-test",
        medicationId: metformin.id,
        date: "2026-07-02",
        status: "skipped",
        barrier: "cost",
        recordedAt: "2026-07-02T20:00:00.000Z"
      }
    ];

    const contexts = annotateGlucoseWithMedContext([reading], doseEvents, [metformin]);

    expect(contexts).toEqual([{ reading, status: "missed", medNames: ["Metformin"] }]);
  });

  it("returns an empty list for empty readings", () => {
    expect(annotateGlucoseWithMedContext([], [], [])).toEqual([]);
  });
});
