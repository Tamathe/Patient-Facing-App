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

  it("detects plain-language acute vision symptoms the corpus patterns miss", () => {
    expect(screenCrisisRedFlags("I am losing my sight").domain).toBe("vision");
    expect(screenCrisisRedFlags("a curtain came over my eye").domain).toBe("vision");
    expect(screenCrisisRedFlags("lots of new floaters today").domain).toBe("vision");
    expect(screenCrisisRedFlags("I keep seeing flashes of light").domain).toBe("vision");
    expect(screenCrisisRedFlags("everything went dark for a minute").domain).toBe("vision");
    expect(screenCrisisRedFlags("I think I am going blind").domain).toBe("vision");
  });

  it("does not flag general vision-education questions as a crisis", () => {
    expect(screenCrisisRedFlags("will I go blind from diabetes?").matched).toBe(false);
    expect(screenCrisisRedFlags("will I lose my vision someday?").matched).toBe(false);
    expect(screenCrisisRedFlags("what is diabetic retinopathy?").matched).toBe(false);
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

  it.each([
    ["my son says he wants to die", "self_harm"],
    ["honestly she's been saying she wants to die", "self_harm"],
    ["my daughter has been hurting herself", "self_harm"],
    ["he told me he wants to kill himself", "self_harm"],
    ["my kid ran away from home and we can't find her", "acute_danger"],
    ["I can't do this anymore, I want to give up", "caregiver_collapse"]
  ] as const)("classifies caregiver regression %s as %s", (text, domain) => {
    expect(screenCrisisRedFlags(text)).toMatchObject({ matched: true, domain });
  });

  it.each([
    ["my son wants to end his life", "self_harm"],
    ["my daughter threatens to hurt herself", "self_harm"],
    ["my son keeps cutting himself", "self_harm"],
    ["my child wandered off and we still cannot find them", "acute_danger"],
    ["my child got out of the house and is missing", "acute_danger"],
    ["someone is hurting my child", "abuse"],
    ["my daughter is being abused", "abuse"]
  ] as const)("classifies caregiver safety phrase %s as %s", (text, domain) => {
    expect(screenCrisisRedFlags(text)).toMatchObject({ matched: true, domain });
  });

  it.each([
    "he hurt himself at recess yesterday",
    "this waitlist is killing me",
    "I give up trying to get her to eat vegetables",
    "she's dying to ride the horses",
    "he ran away with the soccer ball"
  ])("does not flag caregiver trap %s", (text) => {
    expect(screenCrisisRedFlags(text).matched).toBe(false);
  });

  it.each([
    "my father wants to end his life insurance policy",
    "she wants to end her life support",
    "my dog ran away from home and we still cannot find her",
    "my package got out of the house and is missing"
  ])("does not flag caregiver-context trap %s", (text) => {
    expect(screenCrisisRedFlags(text).matched).toBe(false);
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
    expect(crisisTierForDomain("caregiver_collapse")).toBe("crisis");
    expect(crisisTierForDomain("abuse")).toBe("crisis");
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

    for (const testCase of crisisGateCorpus.filter((entry) => entry.expectedMatched)) {
      expect(screenCrisisRedFlags(testCase.text).domain, testCase.id).toBe(testCase.domain);
    }
  });
});
