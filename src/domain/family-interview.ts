import { z } from "zod";
import { stripUnsafeFamilyRationales } from "./family-diagnosis-lint";
import type { DevNeedDomain, FamilyEvidenceStatus, FamilyProfile } from "./types";

export const devNeedDomainSchema = z.enum([
  "early_intervention",
  "therapies",
  "school_iep",
  "waivers_financial",
  "respite",
  "parent_support",
  "sibling_support",
  "transportation",
  "future_planning",
  "diagnosis_education",
  "recreation"
]);

export const familyInterviewInputSchema = z
  .string()
  .max(5000)
  .refine((value) => value.trim().length >= 10, "Interview text must contain at least 10 characters.");

const familyInterviewFactSchema = z
  .object({
    label: z.string().min(1),
    value: z.string().min(1),
    sourceSnippet: z.string().min(1)
  })
  .strict();

const familyInterviewDomainSchema = z
  .object({
    domain: devNeedDomainSchema,
    rationale: z.string()
  })
  .strict();

export const familyInterviewResultSchema = z
  .object({
    facts: z.array(familyInterviewFactSchema),
    domains: z.array(familyInterviewDomainSchema),
    followUps: z.array(z.string())
  })
  .strict();

export type FamilyInterviewFact = z.infer<typeof familyInterviewFactSchema>;
export type FamilyInterviewDomain = z.infer<typeof familyInterviewDomainSchema>;
export type FamilyInterviewResult = z.infer<typeof familyInterviewResultSchema>;

const DOMAIN_ORDER: readonly DevNeedDomain[] = [
  "early_intervention",
  "therapies",
  "school_iep",
  "waivers_financial",
  "respite",
  "parent_support",
  "sibling_support",
  "transportation",
  "future_planning",
  "diagnosis_education",
  "recreation"
];

const DOMAIN_RATIONALES: Record<DevNeedDomain, string> = {
  early_intervention: "The caregiver described speech or talking concerns for a child under age three.",
  therapies: "The caregiver described speech, talking, or therapy needs.",
  school_iep: "The caregiver described school, IEP, or reading support needs.",
  waivers_financial: "The caregiver asked about waivers or financial support.",
  respite: "The caregiver described needing a break from caregiving.",
  parent_support: "The caregiver described feeling overwhelmed or unsure where to start.",
  sibling_support: "The caregiver asked about support for a sibling.",
  transportation: "The caregiver described a ride or transportation need.",
  future_planning: "The caregiver asked about transition to adulthood or future planning.",
  diagnosis_education: "The caregiver asked for general information about a reported diagnosis.",
  recreation: "The caregiver asked about clubs, sports, horses, or recreation."
};

const DIAGNOSIS_TERM =
  "(?:autism|autistic|ADHD|attention\\s+deficit\\s+hyperactivity\\s+disorder|dyslexia|dyslexic|speech(?:\\s+or|\\s*\\/)?\\s*language\\s+disorder|speech\\s+disorder|language\\s+disorder|developmental\\s+delay|intellectual\\s+disability|Down\\s+syndrome)";
const DIAGNOSIS_LIST = `${DIAGNOSIS_TERM}(?:(?:\\s*,\\s*|\\s+and\\s+|\\s*,?\\s+and\\s+)${DIAGNOSIS_TERM})*`;
const DIAGNOSIS_STATEMENT = new RegExp(
  `\\b(?:he|she|they|my child|our child|my son|our son|my daughter|our daughter|the child)\\s+(?:(?:was|were|is|has been|have been)\\s+(?:just\\s+)?diagnosed\\s+with|has\\s+(?:a\\s+)?diagnosis\\s+of)\\s+(${DIAGNOSIS_LIST})`,
  "iu"
);
const GRADE = /\b(?:kindergarten|(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d{1,2}(?:st|nd|rd|th))\s+grade)\b/i;

export function parseFamilyInterviewPayload(payload: unknown): FamilyInterviewResult | null {
  const parsed = familyInterviewResultSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function isConservativelyUnderThree(profile: FamilyProfile, now: Date): boolean {
  const calendarAge = now.getUTCFullYear() - profile.birthYear;
  if (profile.birthMonth === undefined) {
    return calendarAge >= 0 && calendarAge <= 3;
  }
  const months = calendarAge * 12 + (now.getUTCMonth() + 1 - profile.birthMonth);
  return months >= 0 && months < 36;
}

function extractExplicitFacts(text: string): FamilyInterviewFact[] {
  const facts: FamilyInterviewFact[] = [];
  const grade = text.match(GRADE)?.[0];
  if (grade) {
    facts.push({ label: "Grade", value: grade, sourceSnippet: grade });
  }

  const diagnosis = text.match(DIAGNOSIS_STATEMENT);
  if (diagnosis?.[0] && diagnosis[1]) {
    facts.push({
      label: "Reported diagnosis",
      value: diagnosis[1],
      sourceSnippet: diagnosis[0]
    });
  }
  return facts;
}

export function extractFamilyInterviewMock(
  text: string,
  profile: FamilyProfile,
  now = new Date()
): FamilyInterviewResult {
  const matched = new Set<DevNeedDomain>();
  const speechConcern = /\b(?:speech|talking|therapy|therapies)\b/i.test(text);
  if (speechConcern) {
    matched.add("therapies");
    if (isConservativelyUnderThree(profile, now)) {
      matched.add("early_intervention");
    }
  }
  if (/\b(?:school|IEP|reading)\b/i.test(text)) matched.add("school_iep");
  if (/\b(?:waivers?|money|afford)\b/i.test(text)) matched.add("waivers_financial");
  if (/\b(?:break|exhausted|overwhelmed)\b/i.test(text)) {
    matched.add("respite");
    matched.add("parent_support");
  }
  if (/\b(?:sibling|siblings|brother|sister)\b/i.test(text)) matched.add("sibling_support");
  if (/\b(?:ride|rides|transport|transportation)\b/i.test(text)) matched.add("transportation");
  if (/\b(?:adult[ -]?transition|guardianship|ABLE)\b/i.test(text)) matched.add("future_planning");
  if (/\b(?:clubs?|sports?|horses?|recreation)\b/i.test(text)) matched.add("recreation");
  if (/\b(?:don't|do not) know\b|\bno idea (?:where|how)\b|\bunsure where to start\b/i.test(text)) {
    matched.add("parent_support");
  }

  const domains = DOMAIN_ORDER.filter((domain) => matched.has(domain)).map((domain) => ({
    domain,
    rationale: DOMAIN_RATIONALES[domain]
  }));
  const sanitizedDomains = stripUnsafeFamilyRationales(domains, profile.childFirstName).map(({ domain, rationale }) => ({
    domain,
    rationale: rationale ?? ""
  }));

  return {
    facts: extractExplicitFacts(text),
    domains: sanitizedDomains,
    followUps: []
  };
}

export function familyFactStatus(sourceSnippet: string, rawText: string): FamilyEvidenceStatus {
  return sourceSnippet.length > 0 && rawText.includes(sourceSnippet) ? "patient_reported" : "inferred";
}
