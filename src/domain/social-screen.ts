import type { Language } from "@/i18n/strings";
import type { CareContextItem, ExtractedFact } from "./types";
import type { SdohNeedType } from "./sdoh-resources";

// Material-domain screening only (PRAPARE-core style). No suicidal-ideation,
// mood, or IPV items — plan 03 FR-16 still gates those on the F8 return channel
// even with the F4 crisis pathway built.
export type SocialDomain = "food" | "housing" | "utilities" | "transportation" | "financial";

export type SocialResponse = "yes" | "no" | "declined";

export type SocialAnswer = {
  questionId: string;
  domain: SocialDomain;
  response: SocialResponse;
};

export type SocialScreenQuestion = {
  id: string;
  domain: SocialDomain;
  en: string;
  es: string;
};

export const SOCIAL_DOMAIN_LABELS: Record<SocialDomain, { en: string; es: string }> = {
  food: { en: "Food", es: "Comida" },
  housing: { en: "Housing", es: "Vivienda" },
  utilities: { en: "Utilities", es: "Servicios" },
  transportation: { en: "Transportation", es: "Transporte" },
  financial: { en: "Finances", es: "Finanzas" }
};

export const SOCIAL_SCREEN_QUESTIONS: SocialScreenQuestion[] = [
  {
    id: "social_food",
    domain: "food",
    en: "In the last 12 months, did you worry your food would run out before you had money to buy more?",
    es: "En los últimos 12 meses, ¿te preocupó que la comida se acabara antes de tener dinero para comprar más?"
  },
  {
    id: "social_housing",
    domain: "housing",
    en: "Are you worried about losing your housing or not having a steady place to live?",
    es: "¿Te preocupa perder tu vivienda o no tener un lugar estable donde vivir?"
  },
  {
    id: "social_utilities",
    domain: "utilities",
    en: "In the last 12 months, has an electric, gas, water, or phone company threatened to shut off your service?",
    es: "En los últimos 12 meses, ¿una compañía de luz, gas, agua o teléfono amenazó con cortar tu servicio?"
  },
  {
    id: "social_transportation",
    domain: "transportation",
    en: "In the last 12 months, has a lack of transportation kept you from medical appointments or getting what you need?",
    es: "En los últimos 12 meses, ¿la falta de transporte te impidió ir a citas médicas u obtener lo que necesitas?"
  },
  {
    id: "social_financial",
    domain: "financial",
    en: "Do you have trouble paying for the basics like food, housing, or medicine?",
    es: "¿Tienes dificultad para pagar lo básico como comida, vivienda o medicinas?"
  }
];

// FR-3: pure flag computation — a domain is flagged only on an explicit "yes".
export function computeSocialFlags(answers: SocialAnswer[]): SocialDomain[] {
  const flagged = new Set<SocialDomain>();
  for (const answer of answers) {
    if (answer.response === "yes") {
      flagged.add(answer.domain);
    }
  }
  return SOCIAL_SCREEN_QUESTIONS.map((question) => question.domain).filter((domain) => flagged.has(domain));
}

// Material domains map straight onto the SDOH resource need types.
export function socialDomainToNeedType(domain: SocialDomain): SdohNeedType {
  return domain;
}

// FR-2: answers (including recorded declines, FR-14) become patient-reported
// extracted facts tied to a context item.
export function socialAnswersToFacts(answers: SocialAnswer[], contextItemId: string, language: Language): ExtractedFact[] {
  return answers.map((answer) => {
    const question = SOCIAL_SCREEN_QUESTIONS.find((item) => item.id === answer.questionId);
    const value =
      answer.response === "yes"
        ? "Reported a need"
        : answer.response === "no"
          ? "No need reported"
          : "Declined to answer";
    return {
      id: crypto.randomUUID(),
      contextItemId,
      label: `Social need — ${SOCIAL_DOMAIN_LABELS[answer.domain].en}`,
      value,
      confidence: "high",
      status: "patient_reported",
      sourceSnippet: question ? question[language] : answer.questionId
    };
  });
}

export function buildSocialScreenRecord(
  answers: SocialAnswer[],
  patientId: string,
  createdAt: string,
  language: Language
): { item: CareContextItem; facts: ExtractedFact[] } {
  const flagged = computeSocialFlags(answers)
    .map((domain) => SOCIAL_DOMAIN_LABELS[domain].en)
    .join(", ");
  const item: CareContextItem = {
    id: crypto.randomUUID(),
    patientId,
    title: "Social needs check-in",
    rawText: flagged.length > 0 ? `Reported needs: ${flagged}.` : "No material needs reported.",
    sourceLabel: "Support screen",
    createdAt
  };
  return { item, facts: socialAnswersToFacts(answers, item.id, language) };
}

const SOCIAL_EMERGENCY_PATTERNS = [
  /no food (?:today|left|right now|in the house|at all)/i,
  /nothing to eat/i,
  /(?:kids?|children|child)\b[^.?!]{0,24}\bhungry/i,
  /out of insulin/i,
  /(?:insulin|medicine|medication)s?\b[^.?!]{0,24}\b(?:none left|ran out|all gone)/i,
  /(?:no more|none left|ran out of)\s+(?:insulin|medicine|medication)/i
];

// FR-4: an acute material emergency (no food today, hungry children, out of
// insulin) escalates the same as a medical urgency.
export function screenSocialEmergency(input: string): boolean {
  return SOCIAL_EMERGENCY_PATTERNS.some((pattern) => pattern.test(input));
}

export type ZCodeSuggestion = {
  code: string;
  description: string;
  status: "needs_review";
};

const Z_CODE_BY_DOMAIN: Record<SocialDomain, { code: string; description: string }> = {
  food: { code: "Z59.41", description: "Food insecurity" },
  housing: { code: "Z59.1", description: "Inadequate housing" },
  utilities: { code: "Z59.8", description: "Other problems related to housing and economic circumstances" },
  transportation: { code: "Z59.82", description: "Transportation insecurity" },
  financial: { code: "Z59.86", description: "Financial insecurity" }
};

// Deterministic Z-code suggestions, always needs_review, never auto-applied.
export function suggestZCodes(flags: SocialDomain[]): ZCodeSuggestion[] {
  return flags.map((domain) => ({ ...Z_CODE_BY_DOMAIN[domain], status: "needs_review" as const }));
}
