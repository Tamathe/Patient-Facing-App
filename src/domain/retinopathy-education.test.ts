import { describe, expect, it } from "vitest";
import {
  EDUCATION_CHIPS,
  RETINOPATHY_TOPICS,
  answerEducationQuestion,
  isEducationQuestion
} from "./retinopathy-education";

describe("retinopathy education content", () => {
  it("covers the core curriculum topics", () => {
    const ids = RETINOPATHY_TOPICS.map((topic) => topic.id);
    for (const required of ["what", "silent", "exam", "results", "treatment", "protect"]) {
      expect(ids).toContain(required);
    }
    for (const topic of RETINOPATHY_TOPICS) {
      expect(topic.body.length).toBeGreaterThan(80);
    }
  });

  it("answers every suggested chip with a grounded, sourced answer", () => {
    for (const chip of EDUCATION_CHIPS) {
      const result = answerEducationQuestion(chip);
      expect(result.kind).toBe("answer");
      if (result.kind === "answer") {
        expect(result.text.length).toBeGreaterThan(40);
        expect(result.source).toMatch(/not a diagnosis/i);
      }
    }
  });

  it("maps common phrasings to the right topic", () => {
    expect(answerEducationQuestion("what is diabetic retinopathy?")).toMatchObject({
      text: expect.stringMatching(/eye damage from diabetes/i)
    });
    expect(answerEducationQuestion("does it hurt")).toMatchObject({
      text: expect.stringMatching(/quick and painless/i)
    });
    expect(answerEducationQuestion("how often should I get screened")).toMatchObject({
      text: expect.stringMatching(/about once a year/i)
    });
    expect(answerEducationQuestion("will I go blind")).toMatchObject({
      text: expect.stringMatching(/most serious loss can be avoided/i)
    });
  });

  it("falls back safely for an unrelated question", () => {
    const result = answerEducationQuestion("what is the weather today");
    expect(result.kind).toBe("fallback");
    expect(result.text).toMatch(/care team/i);
  });
});

describe("isEducationQuestion (coach routing gate)", () => {
  it("routes confident DR-education questions", () => {
    expect(isEducationQuestion("what is diabetic retinopathy?")).toBe(true);
    expect(isEducationQuestion("do I need my eyes dilated for the screening?")).toBe(true);
    expect(isEducationQuestion("will I go blind from diabetes?")).toBe(true);
  });

  it("does NOT hijack generic coach questions without eye/vision context", () => {
    expect(isEducationQuestion("will my metformin hurt my stomach?")).toBe(false);
    expect(isEducationQuestion("how much does my medication cost?")).toBe(false);
    expect(isEducationQuestion("what is the weather today")).toBe(false);
  });
});
