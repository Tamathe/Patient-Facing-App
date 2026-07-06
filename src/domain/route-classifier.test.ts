import { describe, expect, it } from "vitest";
import { mockRouteClassifier, parseRouteToolArgs, CLASSIFIER_HREFS } from "./route-classifier";

describe("mockRouteClassifier", () => {
  it("only ever returns navigate, coach, or clarify — never a write action", () => {
    const samples = [
      "take me to my prescriptions",
      "log a reading",
      "why does this matter?",
      "my food and my medicine",
      "delete my data",
      "gibberish zzz",
      "I want to die"
    ];
    for (const sample of samples) {
      const decision = mockRouteClassifier.classify(sample, CLASSIFIER_HREFS);
      expect(["navigate", "coach", "clarify"], `"${sample}"`).toContain(decision.kind);
    }
  });

  it("bridges a synonym the deterministic lexicon does not know", () => {
    expect(mockRouteClassifier.classify("take me to my prescription list", CLASSIFIER_HREFS)).toMatchObject({
      kind: "navigate",
      href: "/medicines"
    });
  });

  it("defers questions and concerns to the Coach", () => {
    expect(mockRouteClassifier.classify("why does my medicine matter?", CLASSIFIER_HREFS).kind).toBe("coach");
    expect(mockRouteClassifier.classify("my prescriptions are confusing me", CLASSIFIER_HREFS).kind).toBe("coach");
  });

  it("asks to clarify when two destinations tie", () => {
    expect(mockRouteClassifier.classify("my food and my medicine", CLASSIFIER_HREFS).kind).toBe("clarify");
  });
});

describe("parseRouteToolArgs (live LLM output guard)", () => {
  it("accepts a navigate to an allowed href", () => {
    expect(parseRouteToolArgs({ kind: "navigate", href: "/numbers", confidence: 0.9 }, CLASSIFIER_HREFS)).toEqual({
      kind: "navigate",
      href: "/numbers",
      confidence: 0.9
    });
  });

  it("rejects a hallucinated href down to coach", () => {
    expect(parseRouteToolArgs({ kind: "navigate", href: "/wire-money", confidence: 0.99 }, CLASSIFIER_HREFS).kind).toBe("coach");
  });

  it("drops clarify candidates outside the allowed set", () => {
    const decision = parseRouteToolArgs({ kind: "clarify", candidates: ["/numbers", "/evil"], confidence: 0.5 }, CLASSIFIER_HREFS);
    expect(decision).toEqual({ kind: "clarify", candidates: ["/numbers"], confidence: 0.5 });
  });

  it("clamps confidence and coerces garbage to coach", () => {
    expect(parseRouteToolArgs({ kind: "navigate", href: "/numbers", confidence: 5 }, CLASSIFIER_HREFS)).toMatchObject({ confidence: 1 });
    expect(parseRouteToolArgs("not an object", CLASSIFIER_HREFS)).toEqual({ kind: "coach", confidence: 0 });
    expect(parseRouteToolArgs({ kind: "addReading", href: "/numbers", value: "80/50" }, CLASSIFIER_HREFS).kind).toBe("coach");
  });
});
