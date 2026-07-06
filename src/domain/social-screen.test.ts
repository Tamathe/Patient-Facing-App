import { describe, expect, it } from "vitest";
import {
  buildSocialScreenRecord,
  computeSocialFlags,
  screenSocialEmergency,
  socialAnswersToFacts,
  suggestZCodes,
  type SocialAnswer
} from "./social-screen";

const answers: SocialAnswer[] = [
  { questionId: "social_food", domain: "food", response: "yes" },
  { questionId: "social_housing", domain: "housing", response: "no" },
  { questionId: "social_utilities", domain: "utilities", response: "no" },
  { questionId: "social_transportation", domain: "transportation", response: "declined" },
  { questionId: "social_financial", domain: "financial", response: "yes" }
];

describe("computeSocialFlags", () => {
  it("flags only the domains answered yes, in question order", () => {
    expect(computeSocialFlags(answers)).toEqual(["food", "financial"]);
  });

  it("flags nothing when there are no yes answers", () => {
    expect(
      computeSocialFlags([{ questionId: "social_food", domain: "food", response: "no" }])
    ).toEqual([]);
  });
});

describe("socialAnswersToFacts", () => {
  it("records every answer as a patient-reported fact, including declines", () => {
    const facts = socialAnswersToFacts(answers, "ctx-1", "en");

    expect(facts.every((fact) => fact.status === "patient_reported")).toBe(true);
    expect(facts.every((fact) => fact.contextItemId === "ctx-1")).toBe(true);
    const declined = facts.find((fact) => fact.label.includes("Transportation"));
    expect(declined?.value).toBe("Declined to answer");
  });

  it("keeps context-item relationships valid via buildSocialScreenRecord", () => {
    const record = buildSocialScreenRecord(answers, "patient-brent", "2026-07-06T12:00:00.000Z", "en");
    expect(record.facts.every((fact) => fact.contextItemId === record.item.id)).toBe(true);
    expect(record.item.title).toBe("Social needs check-in");
  });
});

describe("screenSocialEmergency", () => {
  it("escalates acute material emergencies", () => {
    expect(screenSocialEmergency("I have no food today")).toBe(true);
    expect(screenSocialEmergency("the children are hungry")).toBe(true);
    expect(screenSocialEmergency("I'm out of insulin")).toBe(true);
    expect(screenSocialEmergency("my insulin is all gone")).toBe(true);
  });

  it("does not escalate routine support requests", () => {
    expect(screenSocialEmergency("I need help finding a food pantry this week")).toBe(false);
    expect(screenSocialEmergency("can you help me with my electric bill")).toBe(false);
  });
});

describe("suggestZCodes", () => {
  it("returns deterministic needs_review Z-codes for flagged domains", () => {
    const codes = suggestZCodes(["food", "financial"]);

    expect(codes.map((code) => code.code)).toEqual(["Z59.41", "Z59.86"]);
    expect(codes.every((code) => code.status === "needs_review")).toBe(true);
  });
});
