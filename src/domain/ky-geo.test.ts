import { describe, expect, it } from "vitest";
import { KY_ZIP_CENTROIDS, centroidForZip, haversineMiles, isKnownZip, withDistances } from "./ky-geo";
import { SCREENING_SITES } from "./screening-sites";

describe("haversineMiles", () => {
  it("measures Hazard to Louisville in a realistic range", () => {
    const miles = haversineMiles(centroidForZip("41701"), centroidForZip("40202"));
    expect(miles).toBeGreaterThan(120);
    expect(miles).toBeLessThan(180);
  });

  it("is near zero for the same point", () => {
    expect(haversineMiles(centroidForZip("40202"), centroidForZip("40202"))).toBeLessThan(1);
  });
});

describe("centroidForZip", () => {
  it("resolves an exact known ZIP", () => {
    expect(centroidForZip("40202")).toEqual(KY_ZIP_CENTROIDS["40202"]);
    expect(isKnownZip("40202")).toBe(true);
  });

  it("falls back to the nearest prefix for an unknown neighbor ZIP", () => {
    // 40203 shares the Louisville 402 prefix, so it resolves to the Louisville centroid.
    expect(centroidForZip("40203")).toEqual(centroidForZip("40202"));
    expect(isKnownZip("40203")).toBe(false);
  });

  it("never throws on a junk ZIP", () => {
    expect(() => centroidForZip("")).not.toThrow();
    expect(() => centroidForZip("99999")).not.toThrow();
  });
});

describe("withDistances", () => {
  it("re-ranks the same sites by the entered ZIP", () => {
    const fromHazard = withDistances(SCREENING_SITES, "41701");
    const fromLouisville = withDistances(SCREENING_SITES, "40202");

    const hazardMobile = fromHazard.find((site) => site.id === "site_fqhc_mobile")!;
    const louisvilleFqhc = fromLouisville.find((site) => site.id === "site_fqhc_louisville")!;

    // The Perry County mobile camera is close to Hazard...
    expect(hazardMobile.distanceMiles).toBeLessThan(20);
    // ...and the Louisville FQHC is close to a Louisville ZIP.
    expect(louisvilleFqhc.distanceMiles).toBeLessThan(15);

    // Nearest site flips from an eastern-KY venue to a Louisville venue.
    const nearestFromLouisville = [...fromLouisville].sort((a, b) => a.distanceMiles - b.distanceMiles)[0];
    expect(nearestFromLouisville.city).toBe("Louisville");
  });

  it("never reports less than one mile", () => {
    const sites = withDistances(SCREENING_SITES, "41701");
    expect(sites.every((site) => site.distanceMiles >= 1)).toBe(true);
  });
});
