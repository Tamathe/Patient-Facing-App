import { describe, expect, it } from "vitest";
import { isDiabetesMedication, pickFeaturedMedication } from "./featured-medication";
import { brentState, demoState } from "./fixtures";

describe("pickFeaturedMedication", () => {
  it("features the medicine with an active barrier (metformin for Brent)", () => {
    expect(pickFeaturedMedication(brentState)?.name).toBe("Metformin");
  });

  it("features the only medicine for a single-med hypertension plan (Jordan)", () => {
    expect(pickFeaturedMedication(demoState)?.name).toBe("Lisinopril");
  });

  it("returns undefined with no medications", () => {
    expect(pickFeaturedMedication({ ...demoState, medications: [] })).toBeUndefined();
  });

  it("prefers the first diabetes medicine when nothing has a barrier", () => {
    const noBarrierBrent = {
      ...brentState,
      medications: brentState.medications.map((medication) => ({ ...medication, activeBarriers: [] }))
    };
    expect(pickFeaturedMedication(noBarrierBrent)?.name).toBe("Metformin");
  });
});

describe("isDiabetesMedication", () => {
  it("classifies metformin as a diabetes medicine and lisinopril as not", () => {
    const metformin = brentState.medications.find((medication) => medication.name === "Metformin")!;
    const lisinopril = brentState.medications.find((medication) => medication.name === "Lisinopril")!;
    expect(isDiabetesMedication(metformin)).toBe(true);
    expect(isDiabetesMedication(lisinopril)).toBe(false);
  });
});
