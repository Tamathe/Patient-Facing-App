import { describe, expect, it } from "vitest";
import { bpReadingInputSchema, careContextInputSchema } from "./schemas";

describe("domain schemas", () => {
  it("accepts a valid blood pressure reading", () => {
    const result = bpReadingInputSchema.parse({
      systolic: "128",
      diastolic: "82",
      pulse: "72",
      contexts: ["morning"],
      note: "Before coffee"
    });

    expect(result.systolic).toBe(128);
    expect(result.pulse).toBe(72);
  });

  it("rejects an implausible blood pressure reading", () => {
    expect(() =>
      bpReadingInputSchema.parse({
        systolic: 80,
        diastolic: 120,
        pulse: 72,
        contexts: ["morning"],
        note: "Before coffee"
      })
    ).toThrow();

    expect(() =>
      bpReadingInputSchema.parse({
        systolic: 340,
        diastolic: 20,
        pulse: 72,
        contexts: ["morning"],
        note: ""
      })
    ).toThrow();
  });

  it("requires enough care instruction text to interpret", () => {
    expect(() =>
      careContextInputSchema.parse({
        title: "Visit",
        rawText: "BP",
        sourceLabel: "Portal"
      })
    ).toThrow();
  });

  it("rejects whitespace-only care context text", () => {
    expect(() =>
      careContextInputSchema.parse({
        title: "Visit",
        rawText: "         ",
        sourceLabel: "Portal"
      })
    ).toThrow();
  });
});
