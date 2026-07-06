import { describe, expect, it } from "vitest";
import { findKentuckyResources, getKentuckyResourceById, sdohNeedOptions } from "./sdoh-resources";

describe("findKentuckyResources", () => {
  it("returns Perry County transportation matches before statewide directories", () => {
    const resources = findKentuckyResources({ county: "Perry", needType: "transportation" });

    expect(resources.map((resource) => resource.id).slice(0, 3)).toEqual([
      "lklp_transportation_region_13",
      "kpta_perry_transportation_directory",
      "kynect_resources_statewide"
    ]);
    expect(resources.every((resource) => resource.needTypes.includes("transportation"))).toBe(true);
    expect(resources[0]).toMatchObject({
      name: "LKLP Community Action Council transportation",
      referralMode: "navigator_referral",
      sourceName: "Kentucky Transportation Cabinet Human Services Transportation"
    });
  });

  it("filters by need and keeps Perry food resources local", () => {
    const resources = findKentuckyResources({ county: "Perry", needType: "food" });

    expect(resources[0]).toMatchObject({
      id: "perry_county_resource_guide_food",
      sourceName: "Perry County Resource Guide"
    });
    expect(resources.map((resource) => resource.name)).toContain("Kentucky 211");
    expect(resources.every((resource) => resource.needTypes.includes("food"))).toBe(true);
  });

  it("falls back to statewide kynect and 211 records when no local match exists", () => {
    const resources = findKentuckyResources({ county: "Fayette", needType: "legal" });

    expect(resources.map((resource) => resource.id)).toEqual([
      "kynect_resources_statewide",
      "kentucky_211_statewide"
    ]);
    expect(resources.every((resource) => resource.counties.includes("statewide"))).toBe(true);
  });
});

describe("resource catalog helpers", () => {
  it("exposes patient-facing SDOH need options", () => {
    expect(sdohNeedOptions.map((option) => option.id)).toEqual([
      "transportation",
      "food",
      "housing",
      "utilities",
      "health",
      "mental_health",
      "financial",
      "legal",
      "general"
    ]);
  });

  it("can look up an exact resource for navigator handoff", () => {
    expect(getKentuckyResourceById("kentucky_211_statewide")).toMatchObject({
      name: "Kentucky 211",
      contact: "Dial 211 or text your ZIP code to 898211"
    });
  });
});
