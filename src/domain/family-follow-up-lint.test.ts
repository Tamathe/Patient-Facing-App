import { describe, expect, it } from "vitest";
import type { FamilyFollowUp } from "./family-interview";
import { sanitizeFamilyFollowUps } from "./family-follow-up-lint";

function followUp(question: string, options: string[] = []): FamilyFollowUp {
  return { question, options };
}

describe("sanitizeFamilyFollowUps", () => {
  it("drops diagnosis claims in a question or option", () => {
    expect(
      sanitizeFamilyFollowUps([
        followUp("Does Riley have autism?"),
        followUp("What has helped?", ["Riley has ADHD"]),
        followUp("What has the school offered?", ["Nothing yet"])
      ], "Riley")
    ).toEqual([followUp("What has the school offered?", ["Nothing yet"])]);
  });

  it("drops the entire follow-up when a question or chip names a resource", () => {
    expect(
      sanitizeFamilyFollowUps([
        followUp("Would KY-SPIN help?", ["Maybe"]),
        followUp("Who has helped?", ["First Steps"]),
        followUp("Who helps now?", ["A family member"])
      ])
    ).toEqual([followUp("Who helps now?", ["A family member"])]);
  });

  it("drops statements and advice instead of treating them as questions", () => {
    expect(sanitizeFamilyFollowUps([followUp("Call someone today."), followUp("Who helps now?")])).toEqual([
      followUp("Who helps now?")
    ]);
  });

  it("keeps ordinary school-procedure phrasing that overlaps the new catalog entries", () => {
    // RESOURCE_NAME_PATTERN is built from catalog names, so a generically named
    // procedural entry would silently kill legitimate follow-ups. The proper-noun
    // anchors (IDEA / KDE / FBA) are what keep these alive.
    const survivors = sanitizeFamilyFollowUps([
      followUp("Have you sent the school a written evaluation request?", ["Not yet", "Yes"]),
      followUp("Has the school talked about a behavior intervention plan?", ["No", "Yes"]),
      followUp("How many days has your child been removed from school?", ["A few", "I am not sure"])
    ]);

    expect(survivors).toHaveLength(3);
  });

  it("still drops a follow-up that names a procedural catalog entry outright", () => {
    expect(
      sanitizeFamilyFollowUps([followUp("Should we look at IDEA school discipline protections?")])
    ).toEqual([]);
  });

  it("trims values, deduplicates options, and applies defensive caps", () => {
    const result = sanitizeFamilyFollowUps([
      followUp(" First question? ", [" Yes ", "Yes", "No", "Maybe", "Later"]),
      followUp("Second question?"),
      followUp("Third question?"),
      followUp("Fourth question?")
    ]);

    expect(result).toEqual([
      followUp("First question?", ["Yes", "No", "Maybe", "Later"]),
      followUp("Second question?"),
      followUp("Third question?")
    ]);
  });
});
