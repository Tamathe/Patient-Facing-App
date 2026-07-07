import { describe, expect, it } from "vitest";
import { SCREENING_COVERAGE_OPTIONS, bestCoverageOptionForSite } from "./coverage-logistics";
import { getKentuckyResourceById } from "./sdoh-resources";
import { SCREENING_SITES } from "./screening-sites";

describe("bestCoverageOptionForSite", () => {
  it("prefers a ride-capable option for the mobile camera", () => {
    const option = bestCoverageOptionForSite(SCREENING_COVERAGE_OPTIONS, "site_fqhc_mobile");
    expect(option?.rideResourceId).toBe("lklp_transportation_region_13");
  });

  it("returns undefined for a site with no seeded coverage", () => {
    expect(bestCoverageOptionForSite(SCREENING_COVERAGE_OPTIONS, "site_missing")).toBeUndefined();
  });

  it("only references real screening sites and real sdoh ride resources", () => {
    const siteIds = new Set(SCREENING_SITES.map((site) => site.id));
    for (const option of SCREENING_COVERAGE_OPTIONS) {
      expect(siteIds.has(option.siteId), option.siteId).toBe(true);
      if (option.rideResourceId) {
        expect(getKentuckyResourceById(option.rideResourceId), option.rideResourceId).toBeDefined();
      }
    }
  });
});
