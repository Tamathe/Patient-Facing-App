import { describe, expect, it } from "vitest";
import { containsFamilyDiagnosisClaim, stripUnsafeFamilyRationales } from "./family-diagnosis-lint";

describe("containsFamilyDiagnosisClaim", () => {
  it("allows generic educational and concern-based phrasing", () => {
    expect(containsFamilyDiagnosisClaim("children with autism often need routines", "Riley")).toBe(false);
    expect(containsFamilyDiagnosisClaim("the concerns you described may be worth discussing", "Riley")).toBe(false);
  });

  it("blocks direct developmental diagnosis claims", () => {
    expect(containsFamilyDiagnosisClaim("this sounds like dyslexia", "Riley")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Riley has autism", "Riley")).toBe(true);
    expect(containsFamilyDiagnosisClaim("your child has ADHD")).toBe(true);
    expect(containsFamilyDiagnosisClaim("she was diagnosed with dyslexia")).toBe(true);
    expect(containsFamilyDiagnosisClaim("he is diagnosed with developmental delay")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Riley appears to have Down syndrome", "Riley")).toBe(true);
  });

  it("escapes a dynamic child first name before building a regular expression", () => {
    expect(containsFamilyDiagnosisClaim("Avery.* has autism", "Avery.*")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Avery Jordan has autism", "Avery.*")).toBe(false);
  });

  it("uses Unicode-aware whole-name boundaries for dynamic child names", () => {
    expect(containsFamilyDiagnosisClaim("The summary says Élodie has autism", "Élodie")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Jo-Ann has autism", "Ann")).toBe(false);
  });
});

describe("stripUnsafeFamilyRationales", () => {
  it("drops only unsafe rationale text and preserves each domain object", () => {
    const domains = [
      { domain: "school_iep" as const, rationale: "This sounds like dyslexia", source: "live" as const },
      {
        domain: "parent_support" as const,
        rationale: "The concerns you described can feel isolating",
        source: "mock" as const
      }
    ];

    expect(stripUnsafeFamilyRationales(domains, "Riley")).toEqual([
      { domain: "school_iep", source: "live" },
      {
        domain: "parent_support",
        rationale: "The concerns you described can feel isolating",
        source: "mock"
      }
    ]);
  });
});
