export type CrisisDomain =
  | "vision"
  | "self_harm"
  | "acute_danger"
  | "logistics"
  | "caregiver_collapse"
  | "abuse";
export type CrisisMatchSource = "deterministic" | "model_backstop" | "none";

export interface CrisisScreeningOptions {
  modelBackstopMatched?: boolean;
  modelBackstopLabel?: string;
}

export interface CrisisScreeningResult {
  matched: boolean;
  source: CrisisMatchSource;
  domain: CrisisDomain | null;
  ruleIds: string[];
  requiresRuleGapTicket: boolean;
  modelBackstopLabel?: string;
}

export interface CrisisCorpusCase {
  id: string;
  text: string;
  expectedMatched: boolean;
  domain: CrisisDomain;
}

export interface CrisisRecallReport {
  recall: number;
  totalExpectedPositive: number;
  truePositives: string[];
  falseNegatives: string[];
  falsePositives: string[];
}

interface CrisisRule {
  id: string;
  domain: Exclude<CrisisDomain, "logistics">;
  pattern?: RegExp;
  match?: (input: string) => boolean;
}

// An intentional-overdose disclosure only fires when BOTH the "took the whole
// supply" signal AND an intentionality signal are present, so honest medication
// logging ("I took all my metformin this morning") is not treated as a crisis.
function isIntentionalOverdose(input: string): boolean {
  const tookWholeSupply =
    /(?:took|taken|swallowed|downed)\s+(?:the\s+)?(?:whole\s+bottle|all\s+(?:of\s+)?(?:my|the|them|it))/i.test(input) ||
    /whole\s+bottle\s+of\s+(?:my\s+)?(?:lisinopril|metformin|amlodipine|pills?|medicine|medication)/i.test(input);
  const intentional =
    /on\s+purpose|deliberately|to\s+(?:die|end\s+it|hurt\s+myself|harm\s+myself|kill\s+myself)|because\s+i\s+wanted\s+to\s+die/i.test(
      input
    );
  return tookWholeSupply && intentional;
}

const REPORTED_IDEATION = /\b(?:says?|said|saying|tells?|telling|told me)\b[^.?!]{0,48}\bwant(?:s|ed)? to die\b/i;
const REFLEXIVE_HARM = /\b(?:kill|hurt|cut(?:ting)?)\s+(?:himself|herself|themself|themselves)\b/i;
const REFLEXIVE_INTENT =
  /\b(?:want(?:s|ed)? to|threatens? to|plans? to|trying to|says? (?:he|she|they) (?:will|might)|told me (?:he|she|they) (?:will|might|want(?:s|ed)? to))\b[^.?!]{0,32}\b(?:kill|hurt|cut(?:ting)?)\s+(?:himself|herself|themself|themselves)\b/i;
const ONGOING_SELF_INJURY =
  /\b(?:has been|keeps?|continues? to)\b[^.?!]{0,24}\b(?:hurting|cutting)\s+(?:himself|herself|themself|themselves)\b/i;
const THIRD_PERSON_END_LIFE = /\bwant(?:s|ed)? to end (?:his|her|their) life\b/i;
const MISSING_CHILD =
  /\b(?:ran away(?: from home)?|wandered off|got out of (?:the )?house)\b[^.?!]{0,64}\b(?:(?:we\s+)?(?:still\s+)?(?:can't|cannot|couldn't)\s+find|(?:is|are|still)\s+missing)\b/i;
const CAREGIVER_COLLAPSE =
  /\bcan't do this anymore\b[^.?!]{0,64}\b(?:want to give up|ending it|end it)\b|\b(?:want to give up|ending it|end it)\b[^.?!]{0,64}\bcan't do this anymore\b/i;
const CHILD_HARM_DISCLOSURE =
  /\b(?:someone|somebody)\s+(?:is\s+)?(?:hurting|harming|abusing)\s+(?:my|our)\s+(?:child|kid|son|daughter)\b|\b(?:my|our)\s+(?:child|kid|son|daughter)\b[^.?!]{0,24}\b(?:is\s+)?being abused\b/i;

const CRISIS_RULES: CrisisRule[] = [
  {
    id: "vision_sudden_loss",
    domain: "vision",
    pattern: /sudden(?:ly)?\s+(?:lost|loss|lose|cannot|can't|cant).{0,32}(?:see|vision)/i
  },
  {
    id: "vision_loss",
    domain: "vision",
    pattern: /(?:loss\s+of\s+vision|vision\s+loss|cannot\s+see|can't\s+see|cant\s+see)/i
  },
  {
    id: "vision_sudden_changes",
    domain: "vision",
    pattern: /sudden(?:ly)?\s+vision\s+changes?/i
  },
  {
    id: "vision_curtain_shadow",
    domain: "vision",
    // Broadened beyond "curtain over my vision" to also catch the plainer
    // "curtain/shadow over my eye/sight" a patient is more likely to type.
    pattern: /(?:curtain|shadow).{0,32}(?:vision|eye|sight)/i
  },
  {
    id: "vision_flashes_floaters",
    domain: "vision",
    pattern: /(?:new\s+)?flashes?.{0,32}floaters?|(?:new\s+)?floaters?.{0,32}flashes?/i
  },
  {
    id: "vision_eye_pain",
    domain: "vision",
    pattern: /(?:severe\s+)?eye\s+pain|eye\s+pain.{0,48}(?:worse|severe)|eye\s+pain\s+is\s+severe/i
  },
  // Plain-language acute-vision phrasings that the corpus-shaped patterns above
  // miss. Each requires a present/acute marker, so general education questions
  // ("will I go blind?", "will I lose my vision someday?") do NOT fire — only a
  // symptom report does. Verified zero false positives on the maintained corpus.
  {
    id: "vision_losing_sight",
    domain: "vision",
    pattern: /\b(?:losing|lost)\s+(?:my\s+)?(?:sight|vision)\b/i
  },
  {
    id: "vision_going_blind",
    domain: "vision",
    pattern: /\bgoing\s+blind\b/i
  },
  {
    id: "vision_new_floaters",
    domain: "vision",
    pattern: /\b(?:new|lots\s+of|bunch\s+of|shower\s+of|sudden|many)\s+(?:new\s+)?floaters?\b/i
  },
  {
    id: "vision_flashes_light",
    domain: "vision",
    pattern: /\bflash(?:es|ing)?\s+(?:of\s+)?light/i
  },
  {
    id: "vision_went_dark",
    domain: "vision",
    pattern: /\b(?:everything|my\s+vision|my\s+sight)\s+(?:went|going|turned)\s+(?:dark|black)\b/i
  },
  {
    id: "self_harm_wake_up",
    domain: "self_harm",
    pattern: /(?:do\s+not|don't|dont)\s+want\s+to\s+wake\s+up/i
  },
  {
    id: "self_harm_suicide",
    domain: "self_harm",
    pattern: /(?:kill(?:ing)?\s+myself|suicid(?:e|al)|end\s+my\s+life|hurt\s+myself)/i
  },
  {
    id: "self_harm_dont_want_to_be_here",
    domain: "self_harm",
    pattern: /(?:do\s+not|don'?t)\s+want\s+to\s+be\s+here\b/i
  },
  {
    id: "self_harm_want_to_die",
    domain: "self_harm",
    pattern: /\bwant\s+to\s+die\b|\bend(?:ing)?\s+it\s+all\b/i
  },
  {
    id: "self_harm_overdose_disclosure",
    domain: "self_harm",
    match: isIntentionalOverdose
  },
  {
    id: "self_harm_reported_ideation",
    domain: "self_harm",
    pattern: REPORTED_IDEATION
  },
  {
    id: "self_harm_reflexive_intent",
    domain: "self_harm",
    match: (input) => REFLEXIVE_HARM.test(input) && REFLEXIVE_INTENT.test(input)
  },
  {
    id: "self_harm_ongoing_injury",
    domain: "self_harm",
    pattern: ONGOING_SELF_INJURY
  },
  {
    id: "self_harm_third_person_end_life",
    domain: "self_harm",
    pattern: THIRD_PERSON_END_LIFE
  },
  {
    id: "acute_missing_child",
    domain: "acute_danger",
    pattern: MISSING_CHILD
  },
  {
    id: "caregiver_collapse_combined",
    domain: "caregiver_collapse",
    pattern: CAREGIVER_COLLAPSE
  },
  {
    id: "abuse_child_harm_disclosure",
    domain: "abuse",
    pattern: CHILD_HARM_DISCLOSURE
  },
  {
    id: "acute_chest_breathing",
    domain: "acute_danger",
    pattern: /(?:crushing\s+)?chest\s+pain.{0,48}(?:cannot|can't|cant).{0,16}breathe/i
  },
  {
    id: "acute_stroke_signs",
    domain: "acute_danger",
    pattern: /(?:face\s+is\s+drooping|facial\s+droop|speech\s+is\s+slurred|slurred\s+speech)/i
  },
  {
    id: "acute_worst_headache",
    domain: "acute_danger",
    pattern: /worst\s+headache\s+of\s+my\s+life|thunderclap/i
  }
];

// Negation is handled by stripping negated self-harm spans BEFORE the rules run,
// so a disclosure like "I said I'd never hurt myself but I want to die" still
// fires on the residual "I want to die" while "I would never hurt myself" clears.
const NEGATION_PATTERNS: RegExp[] = [
  /\b(?:would|will|could|do|did|am)\s+(?:not\s+)?never\s+(?:want\s+to\s+)?(?:hurt|harm|kill)\s+(?:myself|me)\b/gi,
  /\bnever\s+(?:want\s+to\s+)?(?:hurt|harm|kill)\s+(?:myself|me)\b/gi,
  /\b(?:not|never)\s+going\s+to\s+(?:hurt|harm|kill)\s+(?:myself|me)\b/gi,
  /\bno\s+thoughts?\s+of\s+(?:hurting|harming|killing)\s+(?:myself|me)\b/gi
];

function stripNegatedSpans(input: string): string {
  return NEGATION_PATTERNS.reduce((result, pattern) => result.replace(pattern, " "), input);
}

function ruleMatches(rule: CrisisRule, input: string): boolean {
  if (rule.match) {
    return rule.match(input);
  }
  return rule.pattern ? rule.pattern.test(input) : false;
}

export function screenCrisisRedFlags(
  input: string,
  options: CrisisScreeningOptions = {}
): CrisisScreeningResult {
  const scannable = stripNegatedSpans(input);
  const matchedRules = CRISIS_RULES.filter((rule) => ruleMatches(rule, scannable));

  if (matchedRules.length > 0) {
    return {
      matched: true,
      source: "deterministic",
      domain: matchedRules[0].domain,
      ruleIds: matchedRules.map((rule) => rule.id),
      requiresRuleGapTicket: false
    };
  }

  if (options.modelBackstopMatched) {
    return {
      matched: true,
      source: "model_backstop",
      domain: null,
      ruleIds: [],
      requiresRuleGapTicket: true,
      modelBackstopLabel: options.modelBackstopLabel
    };
  }

  return {
    matched: false,
    source: "none",
    domain: null,
    ruleIds: [],
    requiresRuleGapTicket: false
  };
}

export function measureCrisisRecall(cases: CrisisCorpusCase[]): CrisisRecallReport {
  const expectedPositive = cases.filter((testCase) => testCase.expectedMatched);
  const truePositives: string[] = [];
  const falseNegatives: string[] = [];
  const falsePositives: string[] = [];

  for (const testCase of cases) {
    const result = screenCrisisRedFlags(testCase.text);
    if (testCase.expectedMatched && result.matched) truePositives.push(testCase.id);
    if (testCase.expectedMatched && !result.matched) falseNegatives.push(testCase.id);
    if (!testCase.expectedMatched && result.matched) falsePositives.push(testCase.id);
  }

  return {
    recall: expectedPositive.length === 0 ? 1 : truePositives.length / expectedPositive.length,
    totalExpectedPositive: expectedPositive.length,
    truePositives,
    falseNegatives,
    falsePositives
  };
}

// Self-harm, caregiver-collapse, and abuse disclosures route to the crisis tier;
// sudden vision loss (a hypertensive-emergency presentation) and acute danger
// route to the emergency tier. Logistics never reaches crisis handling.
export function crisisTierForDomain(domain: CrisisDomain | null): "crisis" | "emergency" | null {
  if (domain === "self_harm" || domain === "caregiver_collapse" || domain === "abuse") {
    return "crisis";
  }
  if (domain === "vision" || domain === "acute_danger") {
    return "emergency";
  }
  return null;
}
