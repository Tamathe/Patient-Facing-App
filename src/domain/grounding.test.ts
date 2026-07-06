import { describe, expect, it } from "vitest";
import {
  containsClinicalAdjacentClaim,
  extractBloodPressureClaims,
  extractGlucoseClaims,
  extractQuantitativeClaims,
  verifyGrounding,
  type SourceFact
} from "./grounding";

const facts: SourceFact[] = [
  {
    id: "plan-brent",
    label: "Care plan",
    value: "Keep blood pressure and blood sugar in range. Call threshold 160/100. Condition: hypertension.",
    sourceKind: "care_plan",
    sourceName: "Elkhorn Creek Family Medicine",
    confidence: "confirmed",
    patientConfirmed: false,
    effectiveDate: ""
  },
  {
    id: "fact-a1c",
    label: "A1c",
    value: "8.0%",
    sourceKind: "extracted_fact",
    sourceName: "Extracted from care context",
    confidence: "needs_review",
    patientConfirmed: false,
    effectiveDate: ""
  },
  {
    id: "reading-latest",
    label: "Home reading",
    value: "150/94",
    sourceKind: "reading",
    sourceName: "Home monitor",
    confidence: "patient_reported",
    patientConfirmed: true,
    effectiveDate: "2026-07-04T07:10:00.000Z"
  },
  {
    id: "context-avs",
    label: "After-visit summary",
    value: "For type 2 diabetes, continue metformin 500 mg twice daily.",
    sourceKind: "context_item",
    sourceName: "Elkhorn Creek Family Medicine",
    confidence: "imported",
    patientConfirmed: false,
    effectiveDate: ""
  },
  {
    id: "med-metformin",
    label: "Metformin",
    value: "Metformin 500 mg Twice daily. Helps your body handle blood sugar.",
    sourceKind: "medication",
    sourceName: "Elkhorn Creek Family Medicine",
    confidence: "imported",
    patientConfirmed: false,
    effectiveDate: ""
  },
  {
    id: "glucose-latest",
    label: "Home glucose",
    value: "152 mg/dL",
    sourceKind: "reading",
    sourceName: "Home monitor",
    confidence: "patient_reported",
    patientConfirmed: true,
    effectiveDate: "2026-07-04T07:05:00.000Z"
  }
];

describe("containsClinicalAdjacentClaim", () => {
  it("recognizes clinical-adjacent answer text but not generic chatter", () => {
    expect(containsClinicalAdjacentClaim("Your last A1C was 8.0.")).toBe(true);
    expect(containsClinicalAdjacentClaim("Your recent readings are trending up.")).toBe(true);
    expect(containsClinicalAdjacentClaim("I see multiple medications in your plan.")).toBe(false);
    expect(containsClinicalAdjacentClaim("What would you like help with next?")).toBe(false);
  });
});

describe("extractQuantitativeClaims / extractBloodPressureClaims", () => {
  it("extracts A1c claims", () => {
    expect(extractQuantitativeClaims("Your A1C is 8.0 right now.")).toEqual([{ kind: "a1c", value: "8.0" }]);
  });

  it("extracts blood-pressure pairs in slash and word form", () => {
    expect(extractBloodPressureClaims("Your reading is 150/94 today.")).toEqual([
      { systolic: "150", diastolic: "94" }
    ]);
    expect(extractBloodPressureClaims("blood pressure 200 over 130")).toEqual([
      { systolic: "200", diastolic: "130" }
    ]);
  });

  it("extracts glucose claims but ignores bare grams of sugar", () => {
    expect(extractGlucoseClaims("Your blood sugar was 152.")).toEqual([{ value: "152" }]);
    expect(extractGlucoseClaims("glucose of 250")).toEqual([{ value: "250" }]);
    expect(extractGlucoseClaims("65 g of added sugar")).toEqual([]);
  });
});

describe("verifyGrounding", () => {
  it("allows a cited A1c that matches the source fact", () => {
    const result = verifyGrounding({
      answer: "Your A1C is 8.0, and your care team is watching it.",
      sourceFacts: facts,
      citationIds: ["fact-a1c"]
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks an A1c number that does not match cited facts", () => {
    const result = verifyGrounding({
      answer: "Your A1C is 9.9 now, so act quickly.",
      sourceFacts: facts,
      citationIds: ["fact-a1c"]
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("unsupported_numeric_claim:a1c:9.9");
  });

  it("allows a blood-pressure pair that matches a cited reading", () => {
    const result = verifyGrounding({
      answer: "Your reading is 150/94, which is close to your call line.",
      sourceFacts: facts,
      citationIds: ["reading-latest"]
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks blood-pressure numbers that do not match a cited reading", () => {
    const result = verifyGrounding({
      answer: "Your reading is 200/130.",
      sourceFacts: facts,
      citationIds: ["reading-latest"]
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("unsupported_numeric_claim:blood_pressure:200/130");
  });

  it("allows a blood-sugar number that matches a cited glucose reading", () => {
    const result = verifyGrounding({
      answer: "Your blood sugar was 152 this morning, and your care team is watching it.",
      sourceFacts: facts,
      citationIds: ["glucose-latest"]
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks a blood-sugar number that does not match a cited glucose reading", () => {
    const result = verifyGrounding({
      answer: "Your blood sugar is 250 now.",
      sourceFacts: facts,
      citationIds: ["glucose-latest"]
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("unsupported_numeric_claim:glucose:250");
  });

  it("does not misread grams of added sugar in a food answer as a glucose claim", () => {
    const result = verifyGrounding({
      answer: "This bottle has about 65 g of added sugar — more than two days' worth.",
      sourceFacts: facts,
      citationIds: ["plan-brent"]
    });

    expect(result.blockedReasons).not.toContain("unsupported_numeric_claim:glucose:65");
  });

  it("blocks diagnosis claims", () => {
    const result = verifyGrounding({
      answer: "You have diabetes and you are diagnosed with kidney disease.",
      sourceFacts: facts,
      citationIds: ["context-avs"]
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("diagnosis_claim");
  });

  it("blocks medication-change instructions", () => {
    const result = verifyGrounding({
      answer: "You should stop metformin before your next visit.",
      sourceFacts: facts,
      citationIds: ["med-metformin"]
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("medication_change_claim");
  });

  it("does not block a 'do not stop or change the dose' safety note", () => {
    const result = verifyGrounding({
      answer: "Do not stop or change the dose without asking your clinician.",
      sourceFacts: facts,
      citationIds: ["med-metformin"]
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks clinical-adjacent claims with zero supporting facts", () => {
    const result = verifyGrounding({
      answer: "Your blood pressure and readings show you are overdue.",
      sourceFacts: [],
      citationIds: []
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("clinical_adjacent_claim_without_sources");
  });

  it("flags unknown citation ids", () => {
    const result = verifyGrounding({
      answer: "Here is some general information.",
      sourceFacts: facts,
      citationIds: ["does-not-exist"]
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("unknown_citation:does-not-exist");
  });
});
