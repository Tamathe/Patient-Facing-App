import type { DevNeedDomain } from "./types";

const DIAGNOSIS =
  "(?:autism|autistic|ADHD|attention\\s+deficit\\s+hyperactivity\\s+disorder|dyslexia|dyslexic|speech(?:\\s+or|\\s*\\/)?\\s*language\\s+disorder|speech\\s+disorder|language\\s+disorder|developmental\\s+delay|intellectual\\s+disability|Down\\s+syndrome)";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function diagnosisClaimPattern(subject: string): RegExp {
  const claim =
    "(?:has|have|is|are|sounds?\\s+like|appears?\\s+to\\s+have|is\\s+diagnosed\\s+with|are\\s+diagnosed\\s+with|was\\s+diagnosed\\s+with|were\\s+diagnosed\\s+with)";
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}-])(?:${subject})(?=\\s)\\s+${claim}\\s+${DIAGNOSIS}\\b`,
    "iu"
  );
}

export function containsFamilyDiagnosisClaim(rationale: string, childFirstName?: string): boolean {
  const genericSubjects = "he|she|they|your\\s+child|this";
  if (diagnosisClaimPattern(genericSubjects).test(rationale)) {
    return true;
  }

  const trimmedName = childFirstName?.trim();
  return trimmedName ? diagnosisClaimPattern(escapeRegExp(trimmedName)).test(rationale) : false;
}

export function stripUnsafeFamilyRationales<T extends { domain: DevNeedDomain; rationale?: string }>(
  domains: readonly T[],
  childFirstName?: string
): Array<Omit<T, "rationale"> & { rationale?: string }> {
  return domains.map(({ rationale, ...domain }) => {
    if (rationale === undefined || containsFamilyDiagnosisClaim(rationale, childFirstName)) {
      return domain;
    }

    return { ...domain, rationale };
  });
}
