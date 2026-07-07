import React from "react";
import type { ReadingMedStatus } from "@/domain/glucose-med-context";
import type { GlucoseReading } from "@/domain/types";

const tagClass: Record<Exclude<ReadingMedStatus, "unknown">, string> = {
  taken: "bg-calm text-care",
  missed: "bg-pulse/10 text-pulse"
};

export function GlucoseReadingRow({
  reading,
  status,
  medNames
}: {
  reading: GlucoseReading;
  status: ReadingMedStatus;
  medNames: string[];
}) {
  const tagStatus = status === "taken" || status === "missed" ? status : null;
  const tag = tagStatus && medNames.length > 0 ? `${medNames.join(" & ")} ${tagStatus}` : null;

  return (
    <div className="rounded-control border border-ink/10 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <strong>{reading.valueMgDl} mg/dL</strong>
        {tag && tagStatus ? (
          <span className={`rounded-control px-2 py-1 text-xs font-semibold ${tagClass[tagStatus]}`}>{tag}</span>
        ) : null}
      </div>
      <p className="text-ink/65">{new Date(reading.measuredAt).toLocaleString()}</p>
    </div>
  );
}
