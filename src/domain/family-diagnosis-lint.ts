import type { DevDiagnosis, DevNeedDomain, FamilyProfile } from "./types";

const DIAGNOSIS =
  "(?:autism(?:\\s+spectrum\\s+disorder)?|autistic|ASD|autismo|autista|TEA|ADHD|TDAH|attention\\s+deficit\\s+hyperactivity\\s+disorder|trastorno\\s+por\\s+d[eé]ficit\\s+de\\s+atenci[oó]n(?:\\s+e\\s+hiperactividad)?|dyslexia|dyslexic|dislexia|disl[eé]xic[oa]|speech(?:\\s+or|\\s*\\/)?\\s*language\\s+disorder|speech\\s+disorder|language\\s+disorder|trastorno\\s+(?:del|de)\\s+(?:habla|lenguaje)|developmental\\s+delay|retraso\\s+del\\s+desarrollo|intellectual\\s+disability|discapacidad\\s+intelectual|Down\\s+syndrome|s[ií]ndrome\\s+de\\s+Down)";
const EDUCATIONAL_SUFFIX =
  "(?!-(?:related|focused)\\b)(?!\\s+(?:education|information|resources?|overview|educaci[oó]n|informaci[oó]n|recursos?|resumen)\\b)";
const DIAGNOSIS_FACT_LABEL =
  /(?:reported\s+)?diagnos(?:is|es)|condition|disability|medical\s+history|background|diagn[oó]stico|condici[oó]n|discapacidad|historial\s+m[eé]dico|antecedentes/iu;
const DIAGNOSIS_SOURCE_CONTEXT =
  /\b(?:diagnos(?:is|ed|e|tic)|diagn[oó]stic|brochure|handout|article|folleto|children\s+with|kids?\s+with|niñ[oa]s?\s+con)\b/iu;

type KnownDiagnosis = Exclude<DevDiagnosis, "other">;

const DIAGNOSIS_VALUE_ALIASES: Record<KnownDiagnosis, readonly string[]> = {
  autism: ["autism", "autistic", "autism spectrum disorder", "asd", "autismo", "autista", "tea"],
  adhd: [
    "adhd",
    "tdah",
    "attention deficit hyperactivity disorder",
    "trastorno por deficit de atencion",
    "trastorno por deficit de atencion e hiperactividad"
  ],
  dyslexia: ["dyslexia", "dyslexic", "dislexia", "dislexico", "dislexica"],
  speech_language: [
    "speech language disorder",
    "speech or language disorder",
    "speech disorder",
    "language disorder",
    "trastorno del habla",
    "trastorno del lenguaje",
    "trastorno de habla",
    "trastorno de lenguaje"
  ],
  developmental_delay: ["developmental delay", "retraso del desarrollo"],
  intellectual_disability: ["intellectual disability", "discapacidad intelectual"],
  down_syndrome: ["down syndrome", "sindrome de down"]
};
const ADDITIONAL_DIAGNOSIS_VALUES = new Set([
  "cerebral palsy",
  "epilepsy",
  "fetal alcohol spectrum disorder",
  "fetal alcohol syndrome",
  "fragile x syndrome",
  "hydrocephalus",
  "muscular dystrophy",
  "oppositional defiant disorder",
  "rett syndrome",
  "seizure disorder",
  "spina bifida",
  "tourette syndrome"
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function diagnosisClaimPattern(subject: string): RegExp {
  const englishClaim = [
    "(?:likely|probably|possibly|maybe)\\s+(?:has|have)",
    "(?:may|might|could)\\s+(?:have|be)",
    "(?:seems?|appears?)(?:\\s+to\\s+have)?",
    "(?:is|are)\\s+(?:likely|probably|possibly|maybe)",
    "sounds?\\s+like",
    "(?:has|have)\\s+(?:a\\s+)?diagnosis\\s+of",
    "(?:is|are|was|were|has\\s+been|have\\s+been)\\s+diagnosed\\s+(?:with|as)",
    "has",
    "have",
    "is",
    "are"
  ].join("|");
  const spanishClaim = [
    "(?:probablemente|posiblemente|quiz[aá]s?)\\s+(?:tiene|tienen)",
    "(?:puede(?:n)?|podr[ií]a(?:n)?)\\s+(?:tener|ser)",
    "(?:es|son)\\s+(?:probablemente|posiblemente)",
    "parece(?:n)?(?:\\s+tener)?",
    "suena(?:n)?\\s+a",
    "tiene(?:n)?\\s+un\\s+diagn[oó]stico\\s+de",
    "(?:fue|fueron|ha\\s+sido|han\\s+sido)\\s+diagnosticad[oa]s?\\s+(?:con|como)",
    "est[aá](?:n)?\\s+diagnosticad[oa]s?\\s+con",
    "padece(?:n)?",
    "tiene",
    "tienen",
    "es",
    "son"
  ].join("|");

  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}-])(?:${subject})(?=\\s)\\s+(?:${englishClaim}|${spanishClaim})\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}`,
    "iu"
  );
}

function additionalDiagnosisClaimPattern(subject: string): RegExp {
  return new RegExp(
    `(?:` +
      `(?:^|[^\\p{L}\\p{N}-])(?:${subject})(?:['’]s)\\s+diagnosis\\s+is\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}` +
      `|(?:^|[^\\p{L}\\p{N}-])(?:${subject})\\s+has\\s+an?\\s+${DIAGNOSIS}\\s+diagnosis\\b` +
      `|(?:^|[^\\p{L}\\p{N}-])(?:${subject})\\s+meets\\s+diagnostic\\s+criteria\\s+for\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}` +
      `|(?:^|[^\\p{L}\\p{N}-])(?:${subject})\\s+cumple\\s+criterios\\s+diagn[oó]sticos\\s+de\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}` +
      `|(?:^|[^\\p{L}\\p{N}-])(?:${subject})\\s+is\\s+on\\s+the\\s+autism\\s+spectrum\\b` +
      `|(?:^|[^\\p{L}\\p{N}-])${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}\\s+is\\s+possible\\s+for\\s+(?:${subject})(?![\\p{L}\\p{N}-])` +
      `|(?:^|[^\\p{L}\\p{N}-])a\\s+diagnosis\\s+of\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}\\s+fits\\s+(?:${subject})(?![\\p{L}\\p{N}-])` +
      `|(?:^|[^\\p{L}\\p{N}-])es\\s+posible\\s+que\\s+(?:${subject})\\s+tenga\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}` +
      `)`,
    "iu"
  );
}

function symptomDiagnosisClaimPattern(childFirstName?: string): RegExp {
  const childName = childFirstName?.trim() ? escapeRegExp(childFirstName.trim()) : null;
  const englishSymptoms = [
    "symptoms?",
    "(?:his|her|their|these)\\s+symptoms?",
    "the\\s+child(?:['’]s)\\s+symptoms?",
    ...(childName ? [`${childName}(?:['’]s)\\s+(?:symptoms?|behavior)`] : [])
  ].join("|");
  const spanishSymptoms = [
    "s[ií]ntomas",
    "(?:sus|estos)\\s+s[ií]ntomas",
    `los\\s+s[ií]ntomas(?:\\s+de\\s+(?:su\\s+hija${childName ? `|${childName}` : ""}))?`
  ].join("|");
  return new RegExp(
    `(?:` +
      `(?:^|[^\\p{L}\\p{N}-])(?:${englishSymptoms})\\s+(?:indicates?|suggests?|shows?|are\\s+consistent\\s+with)\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}` +
      `|(?:^|[^\\p{L}\\p{N}-])(?:${spanishSymptoms})\\s+(?:indican|sugieren|muestran|son\\s+compatibles\\s+con)\\s+${DIAGNOSIS}\\b${EDUCATIONAL_SUFFIX}` +
      `)`,
    "iu"
  );
}

export function containsFamilyDiagnosisClaim(rationale: string, childFirstName?: string): boolean {
  const genericSubjects = [
    "he",
    "she",
    "they",
    "(?:your|my|our|the)\\s+(?:child|son|daughter)",
    "their\\s+(?:child|son|daughter)",
    "this",
    "[eé]l",
    "ella",
    "ellos",
    "ellas",
    "(?:su|tu|mi)\\s+hij[oa]",
    "(?:nuestro|nuestra)\\s+hij[oa]",
    "(?:el|la)\\s+niñ[oa]",
    "este",
    "esta",
    "esto"
  ].join("|");
  if (diagnosisClaimPattern(genericSubjects).test(rationale) || additionalDiagnosisClaimPattern(genericSubjects).test(rationale)) {
    return true;
  }

  if (symptomDiagnosisClaimPattern(childFirstName).test(rationale)) {
    return true;
  }

  const trimmedName = childFirstName?.trim();
  if (!trimmedName) return false;
  const childName = escapeRegExp(trimmedName);
  return diagnosisClaimPattern(childName).test(rationale) || additionalDiagnosisClaimPattern(childName).test(rationale);
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

type FamilyFactLike = {
  label: string;
  value: string;
  sourceSnippet: string;
};

function normalizeDiagnosisValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function containsNormalizedPhrase(haystack: string, needle: string): boolean {
  return ` ${normalizeDiagnosisValue(haystack)} `.includes(` ${normalizeDiagnosisValue(needle)} `);
}

function profileOtherValues(profile: FamilyProfile): string[] {
  return profile.diagnoses.flatMap(({ label, otherLabel }) =>
    label === "other" && otherLabel?.trim() ? [normalizeDiagnosisValue(otherLabel)] : []
  );
}

function knownDiagnosisForValue(value: string): KnownDiagnosis | null {
  const normalizedValue = normalizeDiagnosisValue(value);
  const entry = (Object.entries(DIAGNOSIS_VALUE_ALIASES) as Array<[KnownDiagnosis, readonly string[]]>).find(
    ([diagnosis, aliases]) =>
      aliases.some((alias) => {
        if (normalizedValue === alias) return true;
        if (diagnosis === "adhd") {
          return new RegExp(`^${escapeRegExp(alias)}\\s+(?:combined|inattentive|hyperactive)(?:\\s+type|\\s+presentation)?$`, "u").test(
            normalizedValue
          );
        }
        if (diagnosis === "autism") {
          return new RegExp(`^${escapeRegExp(alias)}\\s+level\\s+[123]$`, "u").test(normalizedValue);
        }
        return false;
      })
  );
  return entry?.[0] ?? null;
}

function isAdditionalDiagnosisValue(value: string): boolean {
  return ADDITIONAL_DIAGNOSIS_VALUES.has(normalizeDiagnosisValue(value));
}

function splitDiagnosisValues(value: string, profile: FamilyProfile): string[] {
  const normalizedValue = normalizeDiagnosisValue(value);
  if (!normalizedValue) return [];
  if (knownDiagnosisForValue(normalizedValue) || profileOtherValues(profile).includes(normalizedValue)) {
    return [normalizedValue];
  }

  return value
    .split(/\s*(?:,\s*(?:and|y)?\s*|;|&|\band\b|\by\b)\s*/iu)
    .map(normalizeDiagnosisValue)
    .filter(Boolean);
}

function profileSupportsOther(value: string, sourceSnippet: string, profile: FamilyProfile): boolean {
  const normalizedValue = normalizeDiagnosisValue(value);
  return profileOtherValues(profile).some(
    (normalizedOther) => normalizedValue === normalizedOther && containsNormalizedPhrase(sourceSnippet, normalizedOther)
  );
}

function hasUnsafeDiagnosisContext(sourceSnippet: string): boolean {
  if (/[?¿]/u.test(sourceSnippet)) return true;
  const normalized = normalizeDiagnosisValue(sourceSnippet);
  const uncertaintyOrNegation =
    /\b(?:ask(?:ed|ing)?|wonder(?:ed|ing)?|want\s+to\s+know|whether|if|could|maybe|perhaps|possibly|not|never|wasn\s+t|doesn\s+t|isn\s+t|aren\s+t|hasn\s+t|haven\s+t|didn\s+t|pregunt(?:a|o|ando)|saber\s+si|podria|quizas|tal\s+vez|no|nunca|jamas|sin|carece)\b/iu;
  const wrongSubject =
    /(?:^|[.!?]\s*)(?:i|yo|a\s+mi|me)\s+(?:was\s+|have\s+been\s+)?diagnos|\ba\s+mi\s+me\s+diagnosticaron\b/iu;
  const wrongFamilyMember =
    /\b(?:husband|wife|spouse|brother|sister|cousin|mother|father|espos[oa]|herman[oa]|primo|prima|madre|padre)\b/iu;
  const genericSubject =
    /\b(?:children|kids?|families|people|ninos?|ninas?|familias|personas)\b[^.?!]{0,48}\b(?:diagnos|with|con)\b/iu;
  const informationalContext = /\b(?:brochure|handout|article|website|folleto|articulo|sitio\s+web)\b/iu;
  const postAssertionRetraction =
    /\b(?:does?\s+not\s+have|do\s+not\s+have|ruled\s+out|withdrawn|retracted|misdiagnos\w*|wrong|error|no\s+tiene|descart\w*|retirad[oa]|equivocad[oa])\b/iu;

  return (
    uncertaintyOrNegation.test(normalized) ||
    wrongSubject.test(normalized) ||
    wrongFamilyMember.test(normalized) ||
    genericSubject.test(normalized) ||
    informationalContext.test(normalized) ||
    postAssertionRetraction.test(normalized)
  );
}

function affirmativeDiagnosisSegments(sourceSnippet: string, profile: FamilyProfile): string[] {
  const childName = profile.childFirstName?.trim();
  const childSubjects = [
    "he",
    "she",
    "they",
    "my\\s+child",
    "our\\s+child",
    "the\\s+child",
    "my\\s+son",
    "our\\s+son",
    "my\\s+daughter",
    "our\\s+daughter",
    "mi\\s+hij[oa]",
    "nuestro\\s+hijo",
    "nuestra\\s+hija",
    "[eé]l",
    "ella",
    ...(childName ? [escapeRegExp(childName)] : [])
  ].join("|");
  const subjectFirst = new RegExp(
    `(?:^|[.!?]\\s*)(?:${childSubjects})\\s+(?:(?:(?:was|were|is|are|has\\s+been|have\\s+been)\\s+(?:just\\s+)?diagnosed\\s+(?:with|as))|(?:has|have)\\s+(?:a\\s+)?diagnosis\\s+of|(?:fue|ha\\s+sido|est[aá])\\s+diagnosticad[oa]\\s+(?:con|como)|tiene\\s+un\\s+diagn[oó]stico\\s+de)\\s+([^.!?]+)`,
    "giu"
  );
  const spanishClinicianFirst = new RegExp(
    `(?:^|[.!?]\\s*)a\\s+(?:${childSubjects})\\s+le\\s+diagnosticaron\\s+([^.!?]+)`,
    "giu"
  );
  const directChildStatement = new RegExp(
    `(?:^|[.!?]\\s*)(?:${childSubjects})\\s+(?:has|have|is|are|tiene|es)\\s+([^.!?]+)`,
    "giu"
  );
  const possessiveDiagnosis = new RegExp(
    `(?:^|[.!?]\\s*)(?:${childSubjects})(?:['’]s)\\s+diagnosis\\s+is\\s+([^.!?]+)`,
    "giu"
  );
  const receivedDiagnosis = new RegExp(
    `(?:^|[.!?]\\s*)(?:${childSubjects})\\s+received\\s+an?\\s+([^.!?]+?)\\s+diagnosis(?:$|[.!?])`,
    "giu"
  );
  const englishClinicianFirst = new RegExp(
    `(?:^|[.!?]\\s*)(?:the\\s+)?(?:pediatrician|doctor|clinician)\\s+diagnosed\\s+(?:${childSubjects})\\s+with\\s+([^.!?]+)`,
    "giu"
  );
  const spanishNamedClinician = new RegExp(
    `(?:^|[.!?]\\s*)(?:el\\s+)?(?:pediatra|m[eé]dico|cl[ií]nico)\\s+diagnostic[oó]\\s+a\\s+(?:${childSubjects})\\s+con\\s+([^.!?]+)`,
    "giu"
  );
  return [
    subjectFirst,
    spanishClinicianFirst,
    directChildStatement,
    possessiveDiagnosis,
    receivedDiagnosis,
    englishClinicianFirst,
    spanishNamedClinician
  ].flatMap((pattern) =>
    [...sourceSnippet.matchAll(pattern)].flatMap((match) => (match[1] ? [match[1]] : []))
  );
}

function segmentContainsDiagnosis(segment: string, diagnosis: KnownDiagnosis): boolean {
  return DIAGNOSIS_VALUE_ALIASES[diagnosis].some((alias) => containsNormalizedPhrase(segment, alias));
}

function isDiagnosisSpecificFact(
  fact: FamilyFactLike,
  diagnosisValues: readonly string[],
  profile: FamilyProfile
): boolean {
  if (diagnosisValues.some((value) => knownDiagnosisForValue(value))) return true;
  if (diagnosisValues.some((value) => isAdditionalDiagnosisValue(value))) return true;
  if (diagnosisValues.some((value) => profileOtherValues(profile).includes(normalizeDiagnosisValue(value)))) {
    return true;
  }
  if (DIAGNOSIS_FACT_LABEL.test(fact.label) || DIAGNOSIS_SOURCE_CONTEXT.test(fact.sourceSnippet)) return true;
  return false;
}

function isSupportedDiagnosisFact(fact: FamilyFactLike, rawText: string, profile: FamilyProfile): boolean {
  const diagnosisValues = splitDiagnosisValues(fact.value, profile);
  if (!isDiagnosisSpecificFact(fact, diagnosisValues, profile)) return true;
  if (!fact.sourceSnippet || !rawText.includes(fact.sourceSnippet)) return false;
  if (hasUnsafeDiagnosisContext(fact.sourceSnippet)) return false;

  const explicitSegments = affirmativeDiagnosisSegments(fact.sourceSnippet, profile);
  return (
    diagnosisValues.length > 0 &&
    diagnosisValues.every((value) => {
      const diagnosis = knownDiagnosisForValue(value);
      if (!diagnosis) return profileSupportsOther(value, fact.sourceSnippet, profile);
      return (
        explicitSegments.some((segment) => segmentContainsDiagnosis(segment, diagnosis)) ||
        (profile.diagnoses.some(({ label }) => label === diagnosis) &&
          DIAGNOSIS_VALUE_ALIASES[diagnosis].some((alias) => containsNormalizedPhrase(fact.sourceSnippet, alias)))
      );
    })
  );
}

export function filterUnsupportedDiagnosisFacts<T extends FamilyFactLike>(
  facts: readonly T[],
  rawText: string,
  profile: FamilyProfile
): T[] {
  return facts.filter((fact) => isSupportedDiagnosisFact(fact, rawText, profile));
}
