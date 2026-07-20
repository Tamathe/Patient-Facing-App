import { describe, expect, it } from "vitest";
import { nextBatteryStep, TIER0_BATTERY } from "./battery";

describe("tier-0 battery", () => {
  it("locks the five core instruments in order", () => {
    expect(TIER0_BATTERY).toEqual(["phq2", "gad2", "hunger_vital_sign", "tobacco_use", "nida_single"]);
  });

  it("completes exactly five instruments on the all-negative path", () => {
    const completed: string[] = [];
    const outcomes: Record<string, string> = {};
    while (nextBatteryStep(completed, outcomes) !== "done") {
      const next = nextBatteryStep(completed, outcomes);
      if (next !== "done") {
        completed.push(next);
        outcomes[next] = "negative";
      }
    }
    expect(completed).toEqual(TIER0_BATTERY);
  });

  it("inserts PHQ-9 immediately after a positive PHQ-2", () => {
    expect(nextBatteryStep(["phq2"], { phq2: "positive" })).toBe("phq9");
    expect(nextBatteryStep(["phq2", "phq9"], { phq2: "positive", phq9: "minimal" })).toBe("gad2");
  });

  it("inserts GAD-7 immediately after a positive GAD-2", () => {
    expect(nextBatteryStep(["phq2", "gad2"], { phq2: "negative", gad2: "positive" })).toBe("gad7");
    expect(nextBatteryStep(["phq2", "gad2", "gad7"], { phq2: "negative", gad2: "positive", gad7: "mild" })).toBe("hunger_vital_sign");
  });

  it("does not infer completion for an abandoned flow", () => {
    const completed = ["phq2", "gad2"];
    expect(nextBatteryStep(completed, { phq2: "negative", gad2: "negative" })).toBe("hunger_vital_sign");
    expect(completed).toEqual(["phq2", "gad2"]);
  });
});
