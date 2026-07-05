import { describe, expect, it } from "vitest";
import { classifySafety } from "./safety";

describe("classifySafety", () => {
  it("blocks medication change advice", () => {
    const result = classifySafety("Should I stop taking lisinopril?");

    expect(result.level).toBe("blocked");
    expect(result.response).toContain("I cannot tell you to stop");
  });

  it("escalates warning symptoms", () => {
    const result = classifySafety("I have chest pain and my blood pressure is high.");

    expect(result.level).toBe("escalate");
    expect(result.response).toContain("seek urgent help now");
  });

  it("escalates dangerous blood-pressure-only readings", () => {
    const result = classifySafety("My BP is 200/120");

    expect(result.level).toBe("escalate");
    expect(result.response).toContain("seek urgent help now");
  });

  it("escalates very low blood-pressure readings", () => {
    expect(classifySafety("My BP is 82/50").level).toBe("escalate");
    expect(classifySafety("systolic 85 diastolic 55").level).toBe("escalate");
  });

  it("escalates unlabeled dangerous readings like bare numbers", () => {
    expect(classifySafety("200/120").level).toBe("escalate");
    expect(classifySafety("My reading is 200/120").level).toBe("escalate");
    expect(classifySafety("systolic 200 diastolic 120").level).toBe("escalate");
  });

  it("escalates breathing-related distress language", () => {
    expect(classifySafety("I can't breathe").level).toBe("escalate");
    expect(classifySafety("I cannot breathe").level).toBe("escalate");
    expect(classifySafety("I'm having trouble breathing").level).toBe("escalate");
  });

  it("blocks common medication-adjustment phrasing", () => {
    expect(classifySafety("should I increase my dose").level).toBe("blocked");
    expect(classifySafety("can I take two").level).toBe("blocked");
    expect(classifySafety("Can I stop for a day").level).toBe("blocked");
  });

  it("allows education questions", () => {
    const result = classifySafety("Why does blood pressure medicine matter?");

    expect(result.level).toBe("allowed");
  });
});
