import { describe, expect, it } from "vitest";
import { PREDIABETES_RISK_INSTRUMENT, bmiFrom } from "./prediabetes-risk";

function weightAtBmi(bmi: number, heightIn = 70): number {
  return bmi * heightIn ** 2 / 703;
}

describe("CDC/ADA prediabetes risk operationalization", () => {
  it("computes raw BMI and locks every BMI bucket boundary", () => {
    expect(bmiFrom(70, weightAtBmi(25))).toBeCloseTo(25);
    expect(PREDIABETES_RISK_INSTRUMENT.score([0, 0, 0, 0, 0, 0, 70, weightAtBmi(24.99)]).totalScore).toBe(0);
    expect(PREDIABETES_RISK_INSTRUMENT.score([0, 0, 0, 0, 0, 0, 70, weightAtBmi(25)]).totalScore).toBe(1);
    expect(PREDIABETES_RISK_INSTRUMENT.score([0, 0, 0, 0, 0, 0, 70, weightAtBmi(29.99)]).totalScore).toBe(1);
    expect(PREDIABETES_RISK_INSTRUMENT.score([0, 0, 0, 0, 0, 0, 70, weightAtBmi(30)]).totalScore).toBe(2);
    expect(PREDIABETES_RISK_INSTRUMENT.score([0, 0, 0, 0, 0, 0, 70, weightAtBmi(39.99)]).totalScore).toBe(2);
    expect(PREDIABETES_RISK_INSTRUMENT.score([0, 0, 0, 0, 0, 0, 70, weightAtBmi(40)]).totalScore).toBe(3);
  });

  it("adds each official factor weight and keeps the maximum at 10", () => {
    expect(PREDIABETES_RISK_INSTRUMENT.score([3, 1, 0, 1, 1, 1, 70, weightAtBmi(40)]).totalScore).toBe(10);
    expect(PREDIABETES_RISK_INSTRUMENT.score([3, 0, 1, 1, 1, 1, 70, weightAtBmi(40)]).totalScore).toBe(10);
  });

  it("locks the total-score 4/5 risk boundary", () => {
    expect(PREDIABETES_RISK_INSTRUMENT.score([0, 0, 0, 1, 1, 1, 70, weightAtBmi(25)])).toEqual({
      totalScore: 4,
      band: "lower_risk"
    });
    expect(PREDIABETES_RISK_INSTRUMENT.score([1, 0, 0, 1, 1, 1, 70, weightAtBmi(25)])).toEqual({
      totalScore: 5,
      band: "high_risk"
    });
  });

  it("uses a zero default when the gestational-diabetes question is skipped", () => {
    expect(PREDIABETES_RISK_INSTRUMENT.items[2]).toMatchObject({
      conditionalOn: { itemId: "sex_points", atLeast: 0, atMost: 0 },
      notApplicableValue: 0
    });
    expect(PREDIABETES_RISK_INSTRUMENT.items).toHaveLength(8);
  });
});
