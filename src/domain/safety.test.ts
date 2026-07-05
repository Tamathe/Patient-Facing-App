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
    expect(result.response).toContain("seek urgent medical help");
  });

  it("allows education questions", () => {
    const result = classifySafety("Why does blood pressure medicine matter?");

    expect(result.level).toBe("allowed");
  });
});
