import { describe, expect, it } from "vitest";
import { morganFamilyState } from "./family-fixtures";
import {
  extractFamilyInterviewMock,
  familyFactStatus,
  familyInterviewInputSchema,
  parseFamilyInterviewPayload
} from "./family-interview";

const validPayload = {
  facts: [{ label: "Grade", value: "fourth grade", sourceSnippet: "fourth grade" }],
  domains: [{ domain: "school_iep", rationale: "The caregiver described school concerns." }],
  followUps: ["What support has the school offered?"]
};

describe("family interview contract", () => {
  it("accepts only text from 10 through 5000 characters", () => {
    expect(familyInterviewInputSchema.safeParse("123456789").success).toBe(false);
    expect(familyInterviewInputSchema.safeParse("1234567890").success).toBe(true);
    expect(familyInterviewInputSchema.safeParse("x".repeat(5000)).success).toBe(true);
    expect(familyInterviewInputSchema.safeParse("x".repeat(5001)).success).toBe(false);
    expect(familyInterviewInputSchema.safeParse(" ".repeat(10)).success).toBe(false);
    expect(familyInterviewInputSchema.safeParse(` ${"x".repeat(4999)} `).success).toBe(false);
  });

  it("rejects unknown top-level and nested keys plus blank required strings", () => {
    expect(parseFamilyInterviewPayload({ ...validPayload, surprise: true })).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        facts: [{ ...validPayload.facts[0], confidence: "high" }]
      })
    ).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        domains: [{ ...validPayload.domains[0], resourceName: "A catalog row" }]
      })
    ).toBeNull();
    expect(parseFamilyInterviewPayload({ ...validPayload, facts: [{ label: "", value: "x", sourceSnippet: "x" }] })).toBeNull();
    expect(parseFamilyInterviewPayload({ ...validPayload, facts: [{ label: "x", value: "", sourceSnippet: "x" }] })).toBeNull();
    expect(parseFamilyInterviewPayload({ ...validPayload, facts: [{ label: "x", value: "x", sourceSnippet: "" }] })).toBeNull();
  });

  it("rejects domains outside the developmental need enum", () => {
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        domains: [{ domain: "made_up", rationale: "No." }]
      })
    ).toBeNull();
  });
});

describe("deterministic family interview extraction", () => {
  it("extracts Morgan's explicit grade and diagnoses with expected domains", () => {
    const profile = morganFamilyState.profile;
    expect(profile).not.toBeNull();
    const result = extractFamilyInterviewMock(morganFamilyState.interviewDraft, profile!, new Date("2026-07-17T12:00:00Z"));

    expect(result.facts).toEqual([
      { label: "Grade", value: "fourth grade", sourceSnippet: "fourth grade" },
      {
        label: "Reported diagnosis",
        value: "dyslexia and ADHD",
        sourceSnippet: "She was just diagnosed with dyslexia and ADHD"
      }
    ]);
    expect(result.domains.map(({ domain }) => domain)).toEqual(["school_iep", "waivers_financial", "parent_support"]);
    expect(result.domains.every(({ rationale }) => !/Riley has|your child has|sounds like/i.test(rationale))).toBe(true);
  });

  it.each([
    ["speech and talking", ["early_intervention", "therapies"]],
    ["school IEP reading", ["school_iep"]],
    ["waiver money afford", ["waivers_financial"]],
    ["I need a break and feel exhausted and overwhelmed", ["respite", "parent_support"]],
    ["support for a sibling", ["sibling_support"]],
    ["a ride and transportation", ["transportation"]],
    ["adult transition, guardianship, and ABLE", ["future_planning"]],
    ["clubs, sports, and horses", ["recreation"]]
  ])("maps %s to the required domains", (text, expected) => {
    const profile = { ...morganFamilyState.profile!, birthYear: 2024, birthMonth: 1 };
    expect(extractFamilyInterviewMock(text, profile, new Date("2026-07-17T12:00:00Z")).domains.map(({ domain }) => domain)).toEqual(expected);
  });

  it("adds early intervention for a toddler speech concern but not for an older child", () => {
    const toddler = { ...morganFamilyState.profile!, birthYear: 2024, birthMonth: 8 };
    const older = { ...morganFamilyState.profile!, birthYear: 2017, birthMonth: 8 };

    expect(extractFamilyInterviewMock("My child has trouble talking.", toddler, new Date("2026-07-17T12:00:00Z")).domains.map(({ domain }) => domain)).toEqual([
      "early_intervention",
      "therapies"
    ]);
    expect(extractFamilyInterviewMock("My child has trouble talking.", older, new Date("2026-07-17T12:00:00Z")).domains.map(({ domain }) => domain)).toEqual(["therapies"]);
  });

  it("does not turn a concern into a diagnosis fact", () => {
    const result = extractFamilyInterviewMock("I wonder whether this could be autism.", morganFamilyState.profile!);
    expect(result.facts).toEqual([]);
  });

  it("extracts numeric grades and Oxford-comma diagnosis lists from explicit statements", () => {
    const result = extractFamilyInterviewMock(
      "My daughter is in 4th grade. She was diagnosed with dyslexia, ADHD, and autism.",
      morganFamilyState.profile!
    );
    expect(result.facts).toEqual([
      { label: "Grade", value: "4th grade", sourceSnippet: "4th grade" },
      {
        label: "Reported diagnosis",
        value: "dyslexia, ADHD, and autism",
        sourceSnippet: "She was diagnosed with dyslexia, ADHD, and autism"
      }
    ]);
  });
});

describe("family fact evidence", () => {
  it("marks only a nonempty case-sensitive verbatim substring as patient reported", () => {
    expect(familyFactStatus("fourth grade", "She is in fourth grade.")).toBe("patient_reported");
    expect(familyFactStatus("Fourth grade", "She is in fourth grade.")).toBe("inferred");
    expect(familyFactStatus("", "She is in fourth grade.")).toBe("inferred");
    expect(familyFactStatus("invented", "She is in fourth grade.")).toBe("inferred");
  });
});
