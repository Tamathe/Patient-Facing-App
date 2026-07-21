import { describe, expect, it } from "vitest";
import { FAMILY_VIGNETTES, LEAD_WINDOW } from "./family-vignettes.corpus";
import { runFamilyVignette } from "./family-vignette-runner";

// The deterministic tier of the navigator gate: zero env, build-breaking, and
// exercising exactly the path the demo and e2e run on (mock extraction +
// deterministic retrieval). The live tier lives in scripts/navigator-gate.mjs
// and is advisory — it cannot gate a build that must stay green with no API key.
describe("family vignette gate (deterministic tier)", () => {
  it("covers both languages and keeps the review columns honest", () => {
    expect(FAMILY_VIGNETTES.length).toBeGreaterThanOrEqual(24);
    expect(FAMILY_VIGNETTES.filter(({ language }) => language === "es").length).toBeGreaterThanOrEqual(6);
    expect(new Set(FAMILY_VIGNETTES.map(({ id }) => id)).size).toBe(FAMILY_VIGNETTES.length);
    for (const vignette of FAMILY_VIGNETTES) {
      // A reviewed entry must say who and when, or it is still a draft.
      expect(Boolean(vignette.reviewedBy) === Boolean(vignette.reviewedAt), vignette.id).toBe(true);
    }
  });

  it.each(FAMILY_VIGNETTES.map((vignette) => [vignette.id, vignette] as const))(
    "raises the safety banner exactly when expected: %s",
    (_id, vignette) => {
      const outcome = runFamilyVignette(vignette);
      expect(outcome.safetyBanner).toBe(vignette.expectSafetyBanner);
    }
  );

  it.each(FAMILY_VIGNETTES.map((vignette) => [vignette.id, vignette] as const))(
    "retrieves every required resource: %s",
    (_id, vignette) => {
      const outcome = runFamilyVignette(vignette);
      for (const requiredId of vignette.mustIncludeIds) {
        expect(outcome.resourceIds, `${vignette.id} is missing ${requiredId}`).toContain(requiredId);
      }
    }
  );

  it.each(FAMILY_VIGNETTES.map((vignette) => [vignette.id, vignette] as const))(
    "keeps barred resources out of the lead: %s",
    (_id, vignette) => {
      const outcome = runFamilyVignette(vignette);
      const lead = outcome.resourceIds.slice(0, LEAD_WINDOW);
      for (const barredId of vignette.mustNotIncludeIds) {
        expect(lead, `${vignette.id} led with ${barredId}`).not.toContain(barredId);
      }
    }
  );

  it("never dead-ends: every vignette produces resources or an honest fallback", () => {
    for (const vignette of FAMILY_VIGNETTES) {
      const outcome = runFamilyVignette(vignette);
      expect(outcome.resourceIds.length, vignette.id).toBeGreaterThan(0);
      if (outcome.isFallback) {
        // A fallback is allowed, but it must be the real fallback set — never a
        // domain-specific answer dressed up as one.
        expect(outcome.resourceIds, vignette.id).toContain("ky_spin");
      }
    }
  });

  it("routes the motivating Breathitt case to school procedure, not reading help", () => {
    const vignette = FAMILY_VIGNETTES.find(({ id }) => id === "breathitt_school_exclusion");
    expect(vignette).toBeDefined();
    const outcome = runFamilyVignette(vignette!);

    expect(outcome.safetyBanner).toBe(true);
    expect(outcome.domains).toContain("school_iep");
    expect(outcome.resourceIds).toEqual(
      expect.arrayContaining(["idea_school_discipline", "kde_evaluation_request", "fba_bip_request"])
    );
    expect(outcome.resourceIds.slice(0, LEAD_WINDOW)).not.toContain("kde_parent_toolbox");
  });
});
