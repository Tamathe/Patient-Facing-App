import { z } from "zod";
import { tFamily, type FamilyStringKey } from "@/i18n/family-strings";
import type { Language } from "@/i18n/strings";
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

const DOMAIN_RATIONALE_KEYS: Record<DevNeedDomain, FamilyStringKey> = {
  early_intervention: "rationaleEarlyIntervention",
  therapies: "rationaleTherapies",
  school_iep: "rationaleSchoolIep",
  waivers_financial: "rationaleWaiversFinancial",
  respite: "rationaleRespite",
  parent_support: "rationaleParentSupport",
  sibling_support: "rationaleSiblingSupport",
  transportation: "rationaleTransportation",
  future_planning: "rationaleFuturePlanning",
  diagnosis_education: "rationaleDiagnosisEducation",
  recreation: "rationaleRecreation"
};

const DIAGNOSIS_TERM =
  "(?:autism|autistic|ADHD|attention\\s+deficit\\s+hyperactivity\\s+disorder|dyslexia|dyslexic|speech(?:\\s+or|\\s*\\/)?\\s*language\\s+disorder|speech\\s+disorder|language\\s+disorder|developmental\\s+delay|intellectual\\s+disability|Down\\s+syndrome)";
const DIAGNOSIS_LIST = `${DIAGNOSIS_TERM}(?:(?:\\s*,\\s*|\\s+and\\s+|\\s*,?\\s+and\\s+)${DIAGNOSIS_TERM})*`;
const SPANISH_DIAGNOSIS_TERM =
  "(?:autismo|autista|TDAH|trastorno\\s+por\\s+d[eé]ficit\\s+de\\s+atenci[oó]n(?:\\s+e\\s+hiperactividad)?|dislexia|disl[eé]xic[oa]|trastorno\\s+(?:del|de)\\s+(?:habla|lenguaje)|retraso\\s+del\\s+desarrollo|discapacidad\\s+intelectual|s[ií]ndrome\\s+de\\s+Down)";
const SPANISH_DIAGNOSIS_LIST = `${SPANISH_DIAGNOSIS_TERM}(?:(?:\\s*,\\s*|\\s+y\\s+|\\s*,?\\s+y\\s+)${SPANISH_DIAGNOSIS_TERM})*`;
const GRADE = /\b(?:kindergarten|(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d{1,2}(?:st|nd|rd|th))\s+grade|grade\s+(?:[1-9]|1[0-2]))\b/i;
const SPANISH_GRADE = /\b(?:(?:primer|primero|segundo|tercer|tercero|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno|d[eé]cimo|und[eé]cimo|duod[eé]cimo|\d{1,2}(?:\.?º|\.?ª)?)\s+grado|grado\s+(?:[1-9]|1[0-2]))\b/iu;

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function diagnosisStatement(profile: FamilyProfile, language: Language): RegExp {
  if (language === "es") {
    const subjects = [
      "mi\\s+hij[oa]",
      "nuestro\\s+hij[oa]",
      "el\\s+niño",
      "la\\s+niña"
    ];
    const childFirstName = profile.childFirstName?.trim();
    if (childFirstName) {
      subjects.push(escapeRegExp(childFirstName));
    }
    const subject = `(?:${subjects.join("|")})`;
    return new RegExp(
      `(?<![\\p{L}\\p{N}_-])(?:a\\s+${subject}\\s+le\\s+diagnosticaron|${subject}\\s+(?:fue|ha\\s+sido)\\s+diagnosticad[oa]\\s+con)\\s+(${SPANISH_DIAGNOSIS_LIST})`,
      "iu"
    );
  }

  const subjects = [
    "he",
    "she",
    "they",
    "my\\s+child",
    "our\\s+child",
    "my\\s+son",
    "our\\s+son",
    "my\\s+daughter",
    "our\\s+daughter",
    "the\\s+child"
  ];
  const childFirstName = profile.childFirstName?.trim();
  if (childFirstName) {
    subjects.push(escapeRegExp(childFirstName));
  }
  return new RegExp(
    `(?<![\\p{L}\\p{N}_-])(?:${subjects.join("|")})(?![\\p{L}\\p{N}_-])\\s+(?:(?:was|were|is|has been|have been)\\s+(?:just\\s+)?diagnosed\\s+with|has\\s+(?:a\\s+)?diagnosis\\s+of)\\s+(${DIAGNOSIS_LIST})`,
    "iu"
  );
}

function extractExplicitFacts(text: string, profile: FamilyProfile, language: Language): FamilyInterviewFact[] {
  const facts: FamilyInterviewFact[] = [];
  const grade = text.match(language === "es" ? SPANISH_GRADE : GRADE)?.[0];
  if (grade) {
    facts.push({ label: tFamily(language, "factGradeLabel"), value: grade, sourceSnippet: grade });
  }

  const diagnosis = text.match(diagnosisStatement(profile, language));
  if (diagnosis?.[0] && diagnosis[1]) {
    facts.push({
      label: tFamily(language, "factReportedDiagnosisLabel"),
      value: diagnosis[1],
      sourceSnippet: diagnosis[0]
    });
  }

  const hasSchoolConcern =
    language === "es"
      ? /la\s+tarea\s+de\s+lectura[\s\S]{0,40}una\s+batalla\s+cada\s+noche/iu.test(text)
      : /reading\s+homework[\s\S]{0,30}nightly\s+battle/i.test(text);
  if (hasSchoolConcern) {
    facts.push({
      label: tFamily(language, "factSchoolConcernLabel"),
      value: tFamily(language, "factSchoolConcernValue"),
      sourceSnippet:
        language === "es"
          ? "La tarea de lectura … una batalla cada noche"
          : "Reading homework … nightly battle"
    });
  }
  return facts;
}

export function extractFamilyInterviewMock(
  text: string,
  profile: FamilyProfile,
  now = new Date(),
  language: Language = "en"
): FamilyInterviewResult {
  const matched = new Set<DevNeedDomain>();
  const speechConcern =
    language === "es" ? /\b(?:habla|hablar|lenguaje)\b/iu.test(text) : /\b(?:speech|talking)\b/i.test(text);
  const therapyConcern =
    language === "es" ? /\bterapias?\b/iu.test(text) : /\btherap(?:y|ies)\b/i.test(text);
  if (speechConcern || therapyConcern) {
    matched.add("therapies");
    if (speechConcern && isConservativelyUnderThree(profile, now)) {
      matched.add("early_intervention");
    }
  }
  const schoolConcern =
    language === "es"
      ? /\b(?:escuela|IEP|lectura|tarea)\b/iu.test(text)
      : /\b(?:school|IEP|reading)\b/i.test(text);
  if (schoolConcern) matched.add("school_iep");
  const waiverConcern =
    language === "es"
      ? /\b(?:exenciones?|dinero|econ[oó]mic[oa]s?|pagar)\b/iu.test(text)
      : /\b(?:waivers?|money|afford)\b/i.test(text);
  if (waiverConcern) matched.add("waivers_financial");
  const breakConcern =
    language === "es"
      ? /\b(?:descanso|agotad[oa]s?|abrumad[oa]s?)\b/iu.test(text)
      : /\b(?:break|exhausted|overwhelmed)\b/i.test(text);
  if (breakConcern) {
    matched.add("respite");
    matched.add("parent_support");
  }
  const siblingConcern =
    language === "es"
      ? /\bherman[oa]s?\b/iu.test(text)
      : /\b(?:sibling|siblings|brother|sister)\b/i.test(text);
  if (siblingConcern) matched.add("sibling_support");
  const transportationConcern =
    language === "es"
      ? /\b(?:transporte|transportaci[oó]n|traslado)\b/iu.test(text)
      : /\b(?:ride|rides|transport|transportation)\b/i.test(text);
  if (transportationConcern) matched.add("transportation");
  const futureConcern =
    language === "es"
      ? /\b(?:transici[oó]n\s+a\s+la\s+adultez|tutela|ABLE)\b/iu.test(text)
      : /\b(?:adult[ -]?transition|guardianship|ABLE)\b/i.test(text);
  if (futureConcern) matched.add("future_planning");
  const recreationConcern =
    language === "es"
      ? /\b(?:clubes?|deportes?|caballos?|recreaci[oó]n)\b/iu.test(text)
      : /\b(?:clubs?|sports?|horses?|recreation)\b/i.test(text);
  if (recreationConcern) matched.add("recreation");
  const unsureConcern =
    language === "es"
      ? /\bno\s+s[eé][^.!?]{0,50}\bempezar\b|\bno\s+tengo\s+idea\b[^.!?]{0,50}\bempezar\b/iu.test(text)
      : /\b(?:don't|do not) know\b|\bno idea (?:where|how)\b|\bunsure where to start\b/i.test(text);
  if (unsureConcern) {
    matched.add("parent_support");
  }

  const domains = DOMAIN_ORDER.filter((domain) => matched.has(domain)).map((domain) => ({
    domain,
    rationale: tFamily(language, DOMAIN_RATIONALE_KEYS[domain])
  }));
  const sanitizedDomains = stripUnsafeFamilyRationales(domains, profile.childFirstName).map(({ domain, rationale }) => ({
    domain,
    rationale: rationale ?? ""
  }));

  return {
    facts: extractExplicitFacts(text, profile, language),
    domains: sanitizedDomains,
    followUps: []
  };
}

export function familyFactStatus(sourceSnippet: string, rawText: string): FamilyEvidenceStatus {
  return sourceSnippet.length > 0 && rawText.includes(sourceSnippet) ? "patient_reported" : "inferred";
}
