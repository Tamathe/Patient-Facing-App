import { describe, expect, it } from "vitest";
import { barrierLabel, evidenceStatusLabel } from "./labels";
import type { EvidenceStatus, MedicationBarrier } from "./types";

const barriers: MedicationBarrier[] = [
  "forgot",
  "ran_out",
  "cost",
  "side_effects",
  "confused",
  "scared",
  "pharmacy_issue",
  "does_not_feel_necessary"
];

const statuses: EvidenceStatus[] = ["confirmed", "patient_reported", "imported", "inferred", "needs_review"];

describe("labels", () => {
  it("maps every medication barrier to a human, code-free string", () => {
    for (const barrier of barriers) {
      const label = barrierLabel(barrier);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("_");
    }
  });

  it("maps every evidence status to a human, code-free string", () => {
    for (const status of statuses) {
      const label = evidenceStatusLabel(status);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("_");
    }
  });
});
