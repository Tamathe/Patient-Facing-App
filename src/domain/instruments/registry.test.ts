import { describe, expect, it } from "vitest";
import { getInstrument, INSTRUMENTS } from "./registry";

describe("instrument registry", () => {
  it("registers the tier-0 battery and all expansion instruments", () => {
    expect(Object.keys(INSTRUMENTS)).toEqual([
      "phq9",
      "phq2",
      "gad2",
      "gad7",
      "hunger_vital_sign",
      "tobacco_use",
      "nida_single",
      "lung_ldct_eligibility",
      "crc_eligibility",
      "prediabetes_risk",
      "audit_c",
      "dds2",
      "steadi3",
      "swyc_18mo",
      "swyc_30mo",
      "swyc_posi",
      "psc17",
      "phq_a"
    ]);
    expect(getInstrument("phq2")?.followUp?.instrumentId).toBe("phq9");
    expect(getInstrument("gad2")?.followUp?.instrumentId).toBe("gad7");
  });

  it("locks P2 bands, bilingual content, recurrence, and integrity gates", () => {
    const expected = {
      lung_ldct_eligibility: {
        bands: ["not_eligible", "eligible", "see_clinician_now"],
        wordingVerified: false,
        licenseStatus: "clear"
      },
      crc_eligibility: {
        bands: ["not_due", "due", "see_clinician_now"],
        wordingVerified: false,
        licenseStatus: "clear"
      },
      prediabetes_risk: {
        bands: ["lower_risk", "high_risk"],
        wordingVerified: false,
        licenseStatus: "clear"
      },
      audit_c: {
        bands: ["negative", "positive", "high_risk"],
        wordingVerified: false,
        licenseStatus: "clear"
      },
      dds2: {
        bands: ["lower_distress", "elevated_distress"],
        wordingVerified: false,
        licenseStatus: "clear"
      },
      steadi3: {
        bands: ["lower_risk", "at_risk", "fall_with_injury"],
        wordingVerified: false,
        licenseStatus: "clear"
      }
    } as const;

    for (const [id, metadata] of Object.entries(expected)) {
      const instrument = getInstrument(id);
      expect(instrument).toMatchObject({
        id,
        tier: 2,
        recurrenceDays: 365,
        ...metadata
      });
      expect(instrument?.title.en).toBeTruthy();
      expect(instrument?.title.es).toBeTruthy();
      expect(instrument?.items.every((item) => item.en.length > 0 && item.es.length > 0)).toBe(true);
      expect(metadata.bands.every((band) => Boolean(instrument?.bandSummaries[band]?.en))).toBe(true);
      expect(metadata.bands.every((band) => Boolean(instrument?.bandSummaries[band]?.es))).toBe(true);
      expect(instrument?.consent.en.points.length).toBeGreaterThan(0);
      expect(instrument?.consent.es.points.length).toBeGreaterThan(0);
      expect(instrument?.attribution.en).toBeTruthy();
      expect(instrument?.attribution.es).toBeTruthy();
    }
  });

  it("registers bilingual P4 instruments with draft and license integrity", () => {
    for (const id of ["swyc_18mo", "swyc_30mo", "swyc_posi", "psc17", "phq_a"]) {
      const instrument = getInstrument(id);
      expect(instrument).toBeDefined();
      expect(instrument?.wordingVerified).toBe(false);
      expect(instrument?.title.en).toBeTruthy();
      expect(instrument?.title.es).toBeTruthy();
      expect(instrument?.items.every((item) => item.en.length > 0 && item.es.length > 0)).toBe(true);
      expect(instrument?.bands.every((band) => instrument.bandSummaries[band]?.en && instrument.bandSummaries[band]?.es)).toBe(true);
      expect(instrument?.consent.en.points.length).toBeGreaterThan(0);
      expect(instrument?.consent.es.points.length).toBeGreaterThan(0);
      expect(instrument?.attribution.en).toBeTruthy();
      expect(instrument?.attribution.es).toBeTruthy();
    }
    expect(getInstrument("swyc_18mo")?.licenseStatus).toBe("pending");
    expect(getInstrument("swyc_30mo")?.licenseStatus).toBe("pending");
    expect(getInstrument("swyc_posi")?.licenseStatus).toBe("pending");
    expect(getInstrument("psc17")?.licenseStatus).toBe("clear");
    expect(getInstrument("phq_a")?.licenseStatus).toBe("clear");

    for (const item of getInstrument("swyc_posi")?.items.filter(({ kind }) => kind === "multi_choice") ?? []) {
      const options = item.options ?? [];
      expect(new Set(options.map(({ value }) => value)).size).toBe(options.length);
      expect(options.every(({ value }) => value > 0 && (value & (value - 1)) === 0)).toBe(true);
      expect(options.every(({ score }) => score === 0 || score === 1)).toBe(true);
    }
  });
});
