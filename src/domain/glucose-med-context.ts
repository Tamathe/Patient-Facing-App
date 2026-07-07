import { classifyDiabetesMedication } from "./pdc-adherence";
import type { DoseEvent, GlucoseReading, Medication } from "./types";

export type ReadingMedStatus = "taken" | "missed" | "unknown";

export type ReadingMedContext = {
  reading: GlucoseReading;
  status: ReadingMedStatus;
  medNames: string[];
};

export function annotateGlucoseWithMedContext(
  readings: GlucoseReading[],
  doseEvents: DoseEvent[],
  medications: Medication[]
): ReadingMedContext[] {
  const diabetesMedNamesById = new Map(
    medications
      .filter((medication) => classifyDiabetesMedication(medication.name).status === "included")
      .map((medication) => [medication.id, medication.name])
  );

  return readings.map((reading) => {
    // Reading dates use the UTC day embedded in the ISO timestamp; fixtures align to that day.
    const day = reading.measuredAt.slice(0, 10);
    const diabetesDoseEvents = doseEvents.filter(
      (event) => event.patientId === reading.patientId && event.date === day && diabetesMedNamesById.has(event.medicationId)
    );

    if (diabetesDoseEvents.length === 0) {
      return { reading, status: "unknown", medNames: [] };
    }

    const medNames = [
      ...new Set(
        diabetesDoseEvents.flatMap((event) => {
          const medName = diabetesMedNamesById.get(event.medicationId);
          return medName ? [medName] : [];
        })
      )
    ];
    const status: ReadingMedStatus = diabetesDoseEvents.some((event) => event.status === "skipped") ? "missed" : "taken";

    return { reading, status, medNames };
  });
}
