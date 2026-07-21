import { KY_COUNTIES } from "./family-resources";
import type { FamilyProfile } from "./types";
import type { Language } from "@/i18n/strings";

export type FamilyBasicsHint<TValue> = {
  value: TValue;
  sourceSnippet: string;
  approximate?: boolean;
};

export type FamilyBasicsHints = {
  county?: FamilyBasicsHint<string>;
  birthYear?: FamilyBasicsHint<number>;
  schoolStage?: FamilyBasicsHint<FamilyProfile["schoolStage"]>;
};

const COUNTY_ALTERNATION = KY_COUNTIES.map((county) => county.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

// "Breathitt County" / "condado de Breathitt" is unambiguous. A bare county name
// is only trusted when it follows a live-here verb, because many Kentucky
// counties share a name with an ordinary word (Union, Green, Christian, Clay).
const COUNTY_PATTERNS: Record<Language, readonly RegExp[]> = {
  en: [
    new RegExp(`\\b(${COUNTY_ALTERNATION})\\s+(?:County|Co\\.)`, "i"),
    new RegExp(`\\b(?:live|living|lives|reside|residing|resides|based)\\s+(?:in|near|out\\s+of)\\s+(${COUNTY_ALTERNATION})\\b`, "i")
  ],
  es: [
    new RegExp(`\\bcondado\\s+de\\s+(${COUNTY_ALTERNATION})\\b`, "iu"),
    new RegExp(`\\b(?:vivimos|vivo|vive|viven|residimos)\\s+en\\s+(${COUNTY_ALTERNATION})\\b`, "iu")
  ]
};

const EN_NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20
};

const ES_NUMBER_WORDS: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20
};

const NUMBER_WORDS: Record<Language, Record<string, number>> = { en: EN_NUMBER_WORDS, es: ES_NUMBER_WORDS };

function numberAlternation(language: Language): string {
  return Object.keys(NUMBER_WORDS[language]).join("|");
}

function toCount(raw: string, language: Language): number | null {
  const digits = raw.match(/\d{1,2}/);
  if (digits) return Number(digits[0]);
  const word = NUMBER_WORDS[language][raw.trim().toLowerCase()];
  return word === undefined ? null : word;
}

function ageInYearsPatterns(language: Language): readonly RegExp[] {
  const words = numberAlternation(language);
  if (language === "es") {
    return [
      new RegExp(`\\b(?:de\\s+)?(\\d{1,2}|${words})\\s+añ[oa]s(?:\\s+de\\s+edad)?`, "iu"),
      new RegExp(`\\btiene\\s+(\\d{1,2}|${words})\\b`, "iu")
    ];
  }
  return [
    new RegExp(`\\b(\\d{1,2}|${words})[-\\s]?(?:year|yr)s?[-\\s]?old\\b`, "i"),
    new RegExp(`\\b(\\d{1,2})\\s*(?:yo|y\\/o)\\b`, "i"),
    new RegExp(
      `\\b(?:he|she|they|my\\s+(?:son|daughter|child|kid)|our\\s+(?:son|daughter|child|kid))\\s+(?:is|just\\s+turned|turned)\\s+(\\d{1,2}|${words})\\b`,
      "i"
    ),
    new RegExp(`\\bage[d]?\\s+(\\d{1,2}|${words})\\b`, "i")
  ];
}

function ageInMonthsPatterns(language: Language): readonly RegExp[] {
  const words = numberAlternation(language);
  if (language === "es") {
    return [new RegExp(`\\b(?:de\\s+)?(\\d{1,2}|${words})\\s+meses\\b`, "iu")];
  }
  return [new RegExp(`\\b(\\d{1,2}|${words})[-\\s]?months?[-\\s]?old\\b`, "i")];
}

const GRADE_STAGES: ReadonlyArray<{ pattern: Record<Language, RegExp>; stage: FamilyProfile["schoolStage"] }> = [
  {
    stage: "preschool",
    pattern: {
      en: /\b(?:preschool|pre-?k|head\s+start|nursery\s+school)\b/i,
      es: /\b(?:preescolar|pre-?kinder|jard[ií]n\s+de\s+niños)\b/iu
    }
  },
  {
    stage: "elementary",
    pattern: {
      en: /\b(?:elementary\s+school|kindergarten|(?:first|second|third|fourth|fifth)\s+grade|grade\s+[1-5]|[1-5](?:st|nd|rd|th)\s+grade)\b/i,
      es: /\b(?:escuela\s+primaria|primaria|kinder|(?:primer|segundo|tercer|cuarto|quinto)\s+grado|grado\s+[1-5])\b/iu
    }
  },
  {
    stage: "middle",
    pattern: {
      en: /\b(?:middle\s+school|junior\s+high|(?:sixth|seventh|eighth)\s+grade|grade\s+[6-8]|[6-8](?:st|nd|rd|th)\s+grade)\b/i,
      es: /\b(?:escuela\s+intermedia|secundaria|(?:sexto|s[eé]ptimo|octavo)\s+grado|grado\s+[6-8])\b/iu
    }
  },
  {
    stage: "high",
    pattern: {
      en: /\b(?:high\s+school|(?:ninth|tenth|eleventh|twelfth)\s+grade|grade\s+(?:9|1[0-2])|(?:9|1[0-2])(?:st|nd|rd|th)\s+grade|freshman|sophomore|junior\s+year|senior\s+year)\b/i,
      es: /\b(?:preparatoria|bachillerato|(?:noveno|d[eé]cimo|und[eé]cimo|duod[eé]cimo)\s+grado|grado\s+(?:9|1[0-2]))\b/iu
    }
  },
  {
    stage: "post_high",
    pattern: {
      en: /\b(?:graduated|aged\s+out|college|post-?secondary|adult\s+transition)\b/i,
      es: /\b(?:se\s+gradu[oó]|universidad|possecundaria|transici[oó]n\s+a\s+la\s+adultez)\b/iu
    }
  }
];

// Only used when the caregiver already told us the child is in school; a bare
// age is not enough to guess a stage.
const SCHOOL_MENTION: Record<Language, RegExp> = {
  en: /\b(?:school|teacher|classroom|class|iep|504|principal|homework|grade)\b/i,
  es: /\b(?:escuela|maestr[oa]|sal[oó]n|clase|iep|director[a]?|tarea|grado)\b/iu
};

function stageForAge(ageYears: number): FamilyProfile["schoolStage"] | null {
  if (ageYears >= 5 && ageYears <= 10) return "elementary";
  if (ageYears >= 11 && ageYears <= 13) return "middle";
  if (ageYears >= 14 && ageYears <= 18) return "high";
  if (ageYears >= 19) return "post_high";
  return null;
}

const SNIPPET_MAX = 160;

/** The caregiver's own sentence around a match, so a quote is never a bare word. */
function sentenceAround(text: string, match: string): string {
  const sentence = text
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.includes(match));
  if (!sentence) return match;
  if (sentence.length <= SNIPPET_MAX) return sentence;
  const cut = sentence.slice(0, SNIPPET_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

function firstMatch(text: string, patterns: readonly RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

/**
 * Reads county, birth year, and school stage back out of whatever the caregiver
 * already wrote, so the thread does not ask for the same thing twice. Every hint
 * carries the caregiver's own words and stays unsaved until they confirm it.
 */
export function extractFamilyBasics(text: string, now = new Date(), language: Language = "en"): FamilyBasicsHints {
  const hints: FamilyBasicsHints = {};
  const currentYear = now.getFullYear();

  const county = firstMatch(text, COUNTY_PATTERNS[language]);
  if (county?.[1]) {
    const canonical = KY_COUNTIES.find((candidate) => candidate.toLowerCase() === county[1].toLowerCase());
    if (canonical) {
      hints.county = { value: canonical, sourceSnippet: county[0] };
    }
  }

  let ageYears: number | null = null;
  const years = firstMatch(text, ageInYearsPatterns(language));
  const yearsCount = years?.[1] ? toCount(years[1], language) : null;
  if (years && yearsCount !== null && yearsCount <= 25) {
    ageYears = yearsCount;
    hints.birthYear = { value: currentYear - yearsCount, sourceSnippet: years[0], approximate: true };
  } else {
    const months = firstMatch(text, ageInMonthsPatterns(language));
    const monthsCount = months?.[1] ? toCount(months[1], language) : null;
    if (months && monthsCount !== null && monthsCount <= 47) {
      ageYears = Math.floor(monthsCount / 12);
      hints.birthYear = {
        value: currentYear - Math.floor(monthsCount / 12),
        sourceSnippet: months[0],
        approximate: true
      };
    }
  }

  const stated = GRADE_STAGES.find(({ pattern }) => pattern[language].test(text));
  if (stated) {
    const matched = text.match(stated.pattern[language])?.[0] ?? "";
    hints.schoolStage = { value: stated.stage, sourceSnippet: sentenceAround(text, matched) };
  } else if (ageYears !== null) {
    const mention = SCHOOL_MENTION[language].exec(text);
    const inferred = mention ? stageForAge(ageYears) : null;
    if (inferred && mention) {
      hints.schoolStage = {
        value: inferred,
        sourceSnippet: sentenceAround(text, mention[0]),
        approximate: true
      };
    }
  }

  return hints;
}

export function hasFamilyBasicsHints(hints: FamilyBasicsHints): boolean {
  return hints.county !== undefined || hints.birthYear !== undefined || hints.schoolStage !== undefined;
}
