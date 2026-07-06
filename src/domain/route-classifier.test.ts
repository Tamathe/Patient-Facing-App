import { describe, expect, it } from "vitest";
import { mockRouteClassifier, CLASSIFIER_HREFS } from "./route-classifier";

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
