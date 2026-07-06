import { describe, expect, it } from "vitest";
import { crisisGateCorpus, CRISIS_RECALL_FLOOR } from "./crisis-red-flags.corpus";
import { crisisTierForDomain, measureCrisisRecall, screenCrisisRedFlags } from "./crisis-red-flags";

describe("screenCrisisRedFlags", () => {
  it("detects sudden vision red flags (hypertensive-emergency presentation)", () => {
    expect(screenCrisisRedFlags("A curtain came over my vision").matched).toBe(true);
    expect(screenCrisisRedFlags("I suddenly cannot see out of one eye").matched).toBe(true);
    expect(screenCrisisRedFlags("I have new flashes and floaters").matched).toBe(true);
    expect(screenCrisisRedFlags("A curtain came over my vision").domain).toBe("vision");
  });

  it("detects self-harm and suicidal ideation", () => {
    const result = screenCrisisRedFlags("I do not want to wake up tomorrow");

    expect(result.matched).toBe(true);
    expect(result.domain).toBe("self_harm");
    expect(result.ruleIds.length).toBeGreaterThan(0);
  });

  it("detects the added self-harm phrasings", () => {
    expect(screenCrisisRedFlags("I don't want to be here anymore").domain).toBe("self_harm");
    expect(screenCrisisRedFlags("I want to die").domain).toBe("self_harm");
    expect(screenCrisisRedFlags("I feel like ending it all").domain).toBe("self_harm");
  });

  it("detects intentional overdose disclosures with the medicine named", () => {
    expect(screenCrisisRedFlags("I took the whole bottle of my lisinopril on purpose").domain).toBe("self_harm");
    expect(screenCrisisRedFlags("I swallowed all my metformin to end it").domain).toBe("self_harm");
    expect(screenCrisisRedFlags("I took all of my amlodipine because I wanted to die").domain).toBe("self_harm");
  });

  it("does not flag honest medication logging as an overdose", () => {
    expect(screenCrisisRedFlags("I took all my metformin this morning like I'm supposed to").matched).toBe(false);
    expect(screenCrisisRedFlags("I took the whole bottle home from the pharmacy").matched).toBe(false);
  });

  it("detects acute danger language that must not stay in routine coaching", () => {
    expect(screenCrisisRedFlags("I have crushing chest pain and cannot breathe").matched).toBe(true);
    expect(screenCrisisRedFlags("My face is drooping and my speech is slurred").matched).toBe(true);
    expect(screenCrisisRedFlags("worst headache of my life and my BP is 210 over 120").domain).toBe("acute_danger");
  });

  it("strips negated self-harm spans but still fires on residual disclosures", () => {
    expect(screenCrisisRedFlags("I would never hurt myself").matched).toBe(false);
    expect(screenCrisisRedFlags("I'm not going to hurt myself, I just feel down").matched).toBe(false);
    expect(screenCrisisRedFlags("no thoughts of hurting myself").matched).toBe(false);
    // Negation strip removes only the negated span, so a later disclosure survives.
    expect(screenCrisisRedFlags("I said I'd never hurt myself but I want to die").matched).toBe(true);
  });

  it("does not flag figurative or logistics text", () => {
    expect(screenCrisisRedFlags("I need a Saturday appointment").matched).toBe(false);
    expect(screenCrisisRedFlags("Can someone help me find a ride?").matched).toBe(false);
    expect(screenCrisisRedFlags("this diet is killing me").matched).toBe(false);
    expect(screenCrisisRedFlags("the pharmacy is killing me with these prices").matched).toBe(false);
    expect(screenCrisisRedFlags("I need a ride to my eye appointment").matched).toBe(false);
  });

  it("hard-locks model-backstop-only hits and marks rule gaps", () => {
    const result = screenCrisisRedFlags("The model caught this but rules did not", {
      modelBackstopMatched: true
    });

    expect(result.matched).toBe(true);
    expect(result.source).toBe("model_backstop");
    expect(result.requiresRuleGapTicket).toBe(true);
  });
});

describe("crisisTierForDomain", () => {
  it("routes self-harm to crisis and vision/acute to emergency", () => {
    expect(crisisTierForDomain("self_harm")).toBe("crisis");
    expect(crisisTierForDomain("vision")).toBe("emergency");
    expect(crisisTierForDomain("acute_danger")).toBe("emergency");
    expect(crisisTierForDomain("logistics")).toBeNull();
    expect(crisisTierForDomain(null)).toBeNull();
  });
});

describe("measureCrisisRecall", () => {
  it("meets the recall floor with zero false positives on the maintained corpus", () => {
    const report = measureCrisisRecall(crisisGateCorpus);

    expect(report.recall).toBeGreaterThanOrEqual(CRISIS_RECALL_FLOOR);
    expect(report.falseNegatives).toEqual([]);
    expect(report.falsePositives).toEqual([]);
    expect(report.totalExpectedPositive).toBeGreaterThan(0);
  });
});
