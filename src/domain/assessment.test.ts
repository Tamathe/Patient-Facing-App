import { describe, expect, it } from "vitest";
import {
  PHQ9_CONSENT,
  PHQ9_ITEMS,
  phq9Item9IsPositive,
  scorePhq9,
  severityBandSummary
} from "./assessment";

describe("scorePhq9", () => {
  it("sums responses and maps to published PHQ-9 severity bands", () => {
    expect(scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual({ totalScore: 0, severityBand: "minimal" });
    expect(scorePhq9([1, 1, 1, 1, 1, 0, 0, 0, 0])).toEqual({ totalScore: 5, severityBand: "mild" });
    expect(scorePhq9([2, 2, 2, 1, 1, 1, 1, 0, 0])).toEqual({ totalScore: 10, severityBand: "moderate" });
    expect(scorePhq9([2, 2, 2, 2, 2, 2, 2, 1, 0])).toEqual({ totalScore: 15, severityBand: "moderately_severe" });
    expect(scorePhq9([3, 3, 3, 3, 3, 3, 3, 3, 3])).toEqual({ totalScore: 27, severityBand: "severe" });
  });
});

describe("phq9Item9IsPositive", () => {
  it("flags any non-zero item-9 as a crisis signal regardless of total", () => {
    expect(phq9Item9IsPositive([0, 0, 0, 0, 0, 0, 0, 0, 1])).toBe(true);
    // Item-9 positive with a minimal total (total = 1) still routes to crisis.
    expect(scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 1])).toEqual({ totalScore: 1, severityBand: "minimal" });
  });

  it("does not flag a high total when item-9 is zero", () => {
    const responses = [3, 3, 3, 3, 3, 3, 3, 3, 0];
    expect(phq9Item9IsPositive(responses)).toBe(false);
    expect(scorePhq9(responses).severityBand).toBe("severe");
  });
});

describe("severityBandSummary", () => {
  it("returns non-diagnostic plain-language copy in both languages", () => {
    const en = severityBandSummary("moderate", "en");
    const es = severityBandSummary("moderate", "es");
    expect(en).toContain("not a diagnosis");
    expect(es).toContain("no un diagnóstico");
    expect(en).not.toMatch(/depression|disorder|diagnosed with/i);
  });
});

describe("PHQ-9 content parity", () => {
  it("defines every item and consent point in English and Spanish", () => {
    expect(PHQ9_ITEMS).toHaveLength(9);
    for (const item of PHQ9_ITEMS) {
      expect(item.en.length).toBeGreaterThan(0);
      expect(item.es.length).toBeGreaterThan(0);
    }
    expect(PHQ9_CONSENT.en.points.length).toBe(PHQ9_CONSENT.es.points.length);
    expect(PHQ9_CONSENT.en.points.join(" ")).toContain("988");
    expect(PHQ9_CONSENT.es.points.join(" ")).toContain("988");
  });
});
