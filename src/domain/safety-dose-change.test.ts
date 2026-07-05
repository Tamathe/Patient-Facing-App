import { describe, expect, it } from "vitest";
import { classifySafety } from "./safety";

describe("classifySafety medication-change phrasing", () => {
  it("blocks pause / stop-for-a-week / come-off style requests", () => {
    expect(classifySafety("can I just stop the lisinopril for a week?").level).toBe("blocked");
    expect(classifySafety("should I pause my medication?").level).toBe("blocked");
    expect(classifySafety("I want to come off my lisinopril").level).toBe("blocked");
  });

  it("still allows benign questions", () => {
    expect(classifySafety("why am I taking lisinopril?").level).toBe("allowed");
    expect(classifySafety("what is my blood pressure target?").level).toBe("allowed");
  });
});
