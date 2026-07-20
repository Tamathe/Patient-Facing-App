import { describe, expect, it } from "vitest";
import { AUDIT_C_INSTRUMENT, AUDIT_C_PRIVACY, AUDIT_C_WITHDRAWAL_WARNING } from "./audit-c";

describe("AUDIT-C locked app policy", () => {
  it("excludes sex from the total and applies male 3/4 and female 2/3 boundaries", () => {
    expect(AUDIT_C_INSTRUMENT.score([1, 1, 1, 1])).toEqual({ totalScore: 3, band: "negative" });
    expect(AUDIT_C_INSTRUMENT.score([1, 2, 1, 1])).toEqual({ totalScore: 4, band: "positive" });
    expect(AUDIT_C_INSTRUMENT.score([0, 1, 1, 0])).toEqual({ totalScore: 2, band: "negative" });
    expect(AUDIT_C_INSTRUMENT.score([0, 1, 1, 1])).toEqual({ totalScore: 3, band: "positive" });
  });

  it("overrides the positive band at total 10 through 12", () => {
    expect(AUDIT_C_INSTRUMENT.score([0, 4, 3, 3])).toEqual({ totalScore: 10, band: "high_risk" });
    expect(AUDIT_C_INSTRUMENT.score([1, 4, 4, 4])).toEqual({ totalScore: 12, band: "high_risk" });
  });

  it("locks the withdrawal warning, privacy note, response range, and draft gate", () => {
    expect(AUDIT_C_WITHDRAWAL_WARNING.en).toBe(
      "Cutting back suddenly after heavy drinking can be dangerous. Talk with a clinician about a safe plan first."
    );
    expect(AUDIT_C_PRIVACY.en).toBe(
      "Your answers stay on this device. You choose if and when to share them."
    );
    expect(AUDIT_C_INSTRUMENT.items).toHaveLength(4);
    expect(AUDIT_C_INSTRUMENT.items.slice(1).every((item) => item.options?.map(({ value }) => value).join() === "0,1,2,3,4")).toBe(true);
    expect(AUDIT_C_INSTRUMENT.wordingVerified).toBe(false);
  });
});
