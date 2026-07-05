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

  it("escalates breathing-related distress language", () => {
    expect(classifySafety("I can't breathe").level).toBe("escalate");
    expect(classifySafety("I cannot breathe").level).toBe("escalate");
    expect(classifySafety("I'm having trouble breathing").level).toBe("escalate");
  });

  it("allows education questions", () => {
    const result = classifySafety("Why does blood pressure medicine matter?");

    expect(result.level).toBe("allowed");
  });
});
