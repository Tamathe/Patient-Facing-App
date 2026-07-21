import { describe, expect, it } from "vitest";
import { FAMILY_VIGNETTES } from "./family-vignettes.corpus";
import { runFamilyVignette } from "./family-vignette-runner";

// The LIVE tier of the navigator gate. It is skipped unless the gate script sets
// NAVIGATOR_GATE_LIVE, which keeps `npm run check` green with zero environment
// variables — the build-breaking assertions live in family-vignettes.test.ts.
const live = process.env.NAVIGATOR_GATE_LIVE === "1";

describe.skipIf(!live)("family vignette gate (live tier)", () => {
  it("reports deterministic-path coverage for every vignette", () => {
    const rows = FAMILY_VIGNETTES.map((vignette) => {
      const outcome = runFamilyVignette(vignette);
      return {
        id: vignette.id,
        language: vignette.language,
        reviewed: Boolean(vignette.reviewedBy),
        bannerExpected: vignette.expectSafetyBanner,
        bannerActual: outcome.safetyBanner,
        resources: outcome.resourceIds.length,
        fallback: outcome.isFallback
      };
    });

    const unreviewed = rows.filter(({ reviewed }) => !reviewed).length;
    // eslint-disable-next-line no-console
    console.log(
      `\nVignettes: ${rows.length} (${unreviewed} unreviewed engineering drafts)\n` +
        rows
          .map(
            (row) =>
              `  ${row.bannerExpected === row.bannerActual ? "ok  " : "MISS"} ${row.id} [${row.language}] ` +
              `resources=${row.resources}${row.fallback ? " (fallback)" : ""}`
          )
          .join("\n")
    );

    for (const row of rows) {
      expect(row.bannerActual, row.id).toBe(row.bannerExpected);
      expect(row.resources, row.id).toBeGreaterThan(0);
    }
  });
});
