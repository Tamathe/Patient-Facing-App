import { describe, expect, it } from "vitest";
import type { FamilyProfile } from "./types";
import {
  FAMILY_RESOURCE_CATALOG,
  FIRST_STEPS_POE_BY_COUNTY,
  KY_COUNTIES,
  childAgeYears,
  familyDomainLabel,
  findFamilyResources,
  getFamilyResourceById
} from "./family-resources";

describe("family resource catalog integrity", () => {
  it("contains all 120 unique Kentucky counties and assigns every county to one of 15 POE districts", () => {
    expect(KY_COUNTIES).toHaveLength(120);
    expect(new Set(KY_COUNTIES).size).toBe(120);
    expect(Object.keys(FIRST_STEPS_POE_BY_COUNTY).sort()).toEqual([...KY_COUNTIES].sort());
    expect(new Set(Object.values(FIRST_STEPS_POE_BY_COUNTY)).size).toBe(15);
    expect(FIRST_STEPS_POE_BY_COUNTY.Scott).toBe("Bluegrass");
    expect(FIRST_STEPS_POE_BY_COUNTY.Perry).toBe("Kentucky River");
  });

  it("uses unique stable IDs and valid current source provenance", () => {
    const ids = FAMILY_RESOURCE_CATALOG.map((resource) => resource.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const resource of FAMILY_RESOURCE_CATALOG) {
      expect(() => new URL(resource.sourceUrl)).not.toThrow();
      expect(new URL(resource.sourceUrl).protocol).toMatch(/^https?:$/);
      expect(resource.verifiedAt).toBe("2026-07-17");
      expect(Number.isNaN(Date.parse(resource.verifiedAt))).toBe(false);
    }
  });

  it("flags every source named by the verification policy for human review", () => {
    expect(getFamilyResourceById("ssi_children")?.humanVerify).toBe(true);
    expect(getFamilyResourceById("stable_kentucky")?.humanVerify).toBe(true);
    expect(getFamilyResourceById("sibling_support_project")?.humanVerify).toBe(true);
  });
});

describe("findFamilyResources", () => {
  it("normalizes a County suffix and ranks an exact county match first", () => {
    expect(findFamilyResources({ county: "Scott County", domain: "school_iep", childAgeYears: 9 })[0]?.id).toBe(
      "scott_county_exceptional_child_services"
    );
  });

  it("ranks the correct local First Steps POE before statewide resources", () => {
    const results = findFamilyResources({ county: "Perry", domain: "early_intervention", childAgeYears: 2 });

    expect(results[0]?.id).toBe("first_steps_kentucky_river");
    expect(results.some((resource) => resource.id === "first_steps_statewide")).toBe(true);
  });

  it("falls back to statewide resources when no county-specific resource matches", () => {
    const results = findFamilyResources({ county: "Boone", domain: "sibling_support", childAgeYears: 8 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((resource) => resource.counties.includes("statewide"))).toBe(true);
    expect(results.map((resource) => resource.id)).toContain("sibling_support_project");
  });

  it("filters resources outside the inclusive age range", () => {
    const toddlerResults = findFamilyResources({ county: "Perry", domain: "early_intervention", childAgeYears: 2 });
    const schoolAgeResults = findFamilyResources({ county: "Perry", domain: "early_intervention", childAgeYears: 9 });

    expect(toddlerResults.map((resource) => resource.id)).toContain("first_steps_kentucky_river");
    expect(schoolAgeResults.map((resource) => resource.id)).not.toContain("first_steps_kentucky_river");
    expect(schoolAgeResults.map((resource) => resource.id)).not.toContain("first_steps_statewide");
  });

  it("applies the limit after county-first sorting and handles zero", () => {
    expect(findFamilyResources({ county: "Scott", domain: "school_iep", childAgeYears: 9, limit: 1 })).toHaveLength(1);
    expect(findFamilyResources({ county: "Scott", domain: "school_iep", childAgeYears: 9, limit: 1 })[0]?.id).toBe(
      "scott_county_exceptional_child_services"
    );
    expect(findFamilyResources({ county: "Scott", domain: "school_iep", childAgeYears: 9, limit: 0 })).toEqual([]);
  });

  it("keeps direct ID lookup independent of enrollment state", () => {
    expect(getFamilyResourceById("michelle_p_waiver")?.id).toBe("michelle_p_waiver");
  });
});

describe("family resource helpers", () => {
  it("labels each domain in plain language", () => {
    expect(familyDomainLabel("school_iep")).toBe("School and IEP support");
    expect(familyDomainLabel("waivers_financial")).toBe("Waivers and financial support");
  });

  it("calculates age from a profile with or without a birth month", () => {
    const withMonth: FamilyProfile = {
      birthYear: 2017,
      birthMonth: 8,
      schoolStage: "elementary",
      county: "Scott",
      diagnoses: []
    };
    const yearOnly: FamilyProfile = { ...withMonth, birthMonth: undefined };

    expect(childAgeYears(withMonth, new Date("2026-07-17T12:00:00Z"))).toBe(8);
    expect(childAgeYears(yearOnly, new Date("2026-07-17T12:00:00Z"))).toBe(9);
  });
});
