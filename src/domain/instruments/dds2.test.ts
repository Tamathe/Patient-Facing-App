import { describe, expect, it } from "vitest";
import { DDS2_INSTRUMENT, dds2Band } from "./dds2";

describe("DDS-2", () => {
  it("locks the 2.9/3.0 mean boundary independently of response increments", () => {
    expect(dds2Band(2.9)).toBe("lower_distress");
    expect(dds2Band(3)).toBe("elevated_distress");
  });

  it("scores the two-item mean and routes elevated distress to diabetes support", () => {
    expect(DDS2_INSTRUMENT.score([2, 3])).toEqual({ totalScore: 2.5, band: "lower_distress" });
    expect(DDS2_INSTRUMENT.score([3, 3])).toEqual({ totalScore: 3, band: "elevated_distress" });
    expect(DDS2_INSTRUMENT.bandSummaries.elevated_distress.en).toContain("not a depression or psychiatric diagnosis");
  });

  it("uses exact English DDS-2 wording and the steward Spanish item pair", () => {
    expect(DDS2_INSTRUMENT.items.map(({ en }) => en)).toEqual([
      "Feeling overwhelmed by the demands of living with diabetes.",
      "Feeling that I am often failing with my diabetes regimen."
    ]);
    expect(DDS2_INSTRUMENT.items.map(({ es }) => es)).toEqual([
      "Sentirse abrumado(a) por la atención que requiere vivir con la diabetes.",
      "Sentir que fracaso a menudo con mi régimen de diabetes."
    ]);
    expect(DDS2_INSTRUMENT.defaultOptions?.map(({ value }) => value)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
