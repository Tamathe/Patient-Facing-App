import { extractFamilyInterviewMock } from "./family-interview";
import { domainsAfterSafety, screenFamilySafety } from "./family-safety";
import { buildRankCandidates } from "./family-matching";
import { mergeFamilyDomains } from "./family-screen";
import type { FamilyVignette } from "./family-vignettes.corpus";
import type { DevNeedDomain } from "./types";

export type FamilyVignetteOutcome = {
  safetyBanner: boolean;
  domains: DevNeedDomain[];
  resourceIds: string[];
  isFallback: boolean;
};

/**
 * Runs one vignette through the deterministic path — the same one the zero-key
 * demo, the e2e suite, and every live fallback take. Shared by the in-build gate
 * and the opt-in live gate script so the two can never drift.
 */
export function runFamilyVignette(vignette: FamilyVignette, now = new Date()): FamilyVignetteOutcome {
  const safety = screenFamilySafety(vignette.text);
  const extracted = extractFamilyInterviewMock(vignette.text, vignette.profile, now, vignette.language);
  const extractedDomains = mergeFamilyDomains(
    [],
    extracted.domains.map(({ domain }) => domain)
  );
  const domains = safety ? domainsAfterSafety(extractedDomains, []) : extractedDomains;
  // Scores the candidate set the rank call will receive, not the narrower
  // display slice — ranking cannot surface what retrieval already dropped.
  const matches = buildRankCandidates(vignette.profile, domains, []);

  return {
    safetyBanner: safety !== null,
    domains,
    resourceIds: matches.resources.map(({ resource }) => resource.id),
    isFallback: matches.isFallback
  };
}
