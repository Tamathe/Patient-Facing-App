import { describe, expect, it } from "vitest";
import { withDistances } from "./ky-geo";
import {
  REFERRAL_DESTINATIONS,
  SCREENING_SITES,
  equityGap,
  explainMatch,
  monthsSince,
  nearestDestinationOfKind,
  rankSites,
  venueLabel
} from "./screening-sites";

const fromHazard = withDistances(SCREENING_SITES, "41701");

describe("rankSites", () => {
  it("recommends the supported low-cost mobile camera first from Hazard in best mode", () => {
    const top = rankSites(fromHazard, "best")[0];
    expect(top.id).toBe("site_fqhc_mobile");
  });

  it("sorts closest mode strictly by distance", () => {
    const ranked = rankSites(fromHazard, "closest");
    const distances = ranked.map((site) => site.distanceMiles);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("sorts fastest mode by next availability", () => {
    const ranked = rankSites(fromHazard, "fastest");
    const hours = ranked.map((site) => site.nextAvailableHours);
    expect(hours).toEqual([...hours].sort((a, b) => a - b));
  });

  it("does not mutate its input", () => {
    const before = fromHazard.map((site) => site.id);
    rankSites(fromHazard, "fastest");
    expect(fromHazard.map((site) => site.id)).toEqual(before);
  });
});

describe("explainMatch", () => {
  it("explains the recommendation in plain language, both locales", () => {
    const top = rankSites(fromHazard, "best")[0];
    const en = explainMatch(top, "best", "en");
    const es = explainMatch(top, "best", "es");
    expect(en).toContain("Best match");
    expect(en).toContain(`${top.distanceMiles} miles`);
    expect(en).toContain("ride support");
    expect(es).toContain("Mejor opción");
    expect(es).toContain(`${top.distanceMiles} millas`);
  });
});

describe("referral destinations", () => {
  it("keeps the seeded destination set with retina slots sooner than optometry", () => {
    const names = REFERRAL_DESTINATIONS.map((destination) => destination.name);
    expect(names).toEqual([
      "Hazard Optometry Associates",
      "Whitesburg Family Eye Care",
      "UK Retina — Lexington",
      "Louisville Regional Eye Institute — Retina Service"
    ]);
    const retina = nearestDestinationOfKind("retina");
    const optometry = nearestDestinationOfKind("optometry");
    expect(retina.id).toBe("dest_uk_retina");
    expect(optometry.id).toBe("dest_hazard_optometry");
    expect(optometry.distanceMiles).toBe(2);
    // Urgency is the point of the tier: the soonest retina slot (Jul 9) beats
    // the soonest optometry slot (Jul 14).
    expect(retina.nextSlots[0]).toContain("Jul 9");
    expect(optometry.nextSlots[0]).toContain("Jul 14");
  });
});

describe("equityGap", () => {
  it("surfaces the camera-vs-specialist distance gap from Hazard", () => {
    const gap = equityGap(fromHazard);
    expect(gap).not.toBeNull();
    expect(gap!.eyeMiles).toBeGreaterThan(gap!.cameraMiles + 3);
  });

  it("stays quiet when an eye clinic is just as close", () => {
    const fromLexington = withDistances(SCREENING_SITES, "40507");
    expect(equityGap(fromLexington)).toBeNull();
  });
});

describe("venueLabel", () => {
  it("labels venues in both languages", () => {
    expect(venueLabel("mobile_clinic", "en")).toBe("Mobile camera");
    expect(venueLabel("mobile_clinic", "es")).toBe("Cámara móvil");
    expect(venueLabel("fqhc", "en")).toBe("Community health center");
  });
});

describe("monthsSince", () => {
  it("counts whole months between the last screening and now", () => {
    expect(monthsSince("2024-12-10", new Date("2026-07-07T12:00:00.000Z"))).toBe(18);
    expect(monthsSince("2024-12-10", new Date("2026-07-10T12:00:00.000Z"))).toBe(19);
    expect(monthsSince("2026-07-01", new Date("2026-07-07T12:00:00.000Z"))).toBe(0);
  });
});
