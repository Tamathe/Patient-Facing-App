import { describe, expect, it } from "vitest";
import { getInstrument, INSTRUMENTS } from "./registry";

describe("instrument registry", () => {
  it("registers the tier-0 battery and both expansion instruments", () => {
    expect(Object.keys(INSTRUMENTS)).toEqual([
      "phq9",
      "phq2",
      "gad2",
      "gad7",
      "hunger_vital_sign",
      "tobacco_use",
      "nida_single"
    ]);
    expect(getInstrument("phq2")?.followUp?.instrumentId).toBe("phq9");
    expect(getInstrument("gad2")?.followUp?.instrumentId).toBe("gad7");
  });
});
