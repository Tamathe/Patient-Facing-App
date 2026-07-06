import type { Language } from "@/i18n/strings";

export type SeverityBand = "minimal" | "mild" | "moderate" | "moderately_severe" | "severe";

export type AssessmentEvent = {
  id: string;
  patientId: string;
  instrumentId: "phq9";
  itemResponses: number[];
  totalScore: number;
  severityBand: SeverityBand;
  status: "patient_reported";
  recordedAt: string;
};

export const PHQ9_ITEM_COUNT = 9;
export const PHQ9_MAX_SCORE = 27;

// Standard, unmodified PHQ-9 item wording (last two weeks).
export const PHQ9_ITEMS: Array<{ id: string; en: string; es: string }> = [
  {
    id: "phq9_1",
    en: "Little interest or pleasure in doing things",
    es: "Poco interés o placer en hacer las cosas"
  },
  {
    id: "phq9_2",
    en: "Feeling down, depressed, or hopeless",
    es: "Sentirse desanimado/a, deprimido/a o sin esperanza"
  },
  {
    id: "phq9_3",
    en: "Trouble falling or staying asleep, or sleeping too much",
    es: "Problemas para dormir o quedarse dormido/a, o dormir demasiado"
  },
  {
    id: "phq9_4",
    en: "Feeling tired or having little energy",
    es: "Sentirse cansado/a o con poca energía"
  },
  {
    id: "phq9_5",
    en: "Poor appetite or overeating",
    es: "Poco apetito o comer en exceso"
  },
  {
    id: "phq9_6",
    en: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    es: "Sentirse mal consigo mismo/a — o sentir que es un fracaso o que ha decepcionado a su familia o a sí mismo/a"
  },
  {
    id: "phq9_7",
    en: "Trouble concentrating on things, such as reading the newspaper or watching television",
    es: "Dificultad para concentrarse en cosas, como leer el periódico o ver televisión"
  },
  {
    id: "phq9_8",
    en: "Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual",
    es: "Moverse o hablar tan despacio que otras personas lo podrían haber notado — o estar tan inquieto/a que se ha movido mucho más de lo normal"
  },
  {
    id: "phq9_9",
    en: "Thoughts that you would be better off dead, or of hurting yourself in some way",
    es: "Pensamientos de que estaría mejor muerto/a o de hacerse daño de alguna manera"
  }
];

export const PHQ9_RESPONSE_OPTIONS: Array<{ value: number; en: string; es: string }> = [
  { value: 0, en: "Not at all", es: "Para nada" },
  { value: 1, en: "Several days", es: "Varios días" },
  { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
  { value: 3, en: "Nearly every day", es: "Casi todos los días" }
];

export const PHQ9_CONSENT: Record<
  Language,
  { title: string; points: string[]; acknowledge: string }
> = {
  en: {
    title: "Before you start this check-in",
    points: [
      "This is a short self-check about your mood over the last two weeks. It is not a diagnosis and it is not crisis care or therapy.",
      "A check-in can miss things, so trust yourself — if something feels wrong, reach out to a person.",
      "If you are thinking about hurting yourself, help is one tap away: you can call or text 988 any time."
    ],
    acknowledge: "I understand — start the check-in"
  },
  es: {
    title: "Antes de comenzar este cuestionario",
    points: [
      "Este es un breve autochequeo sobre tu ánimo en las últimas dos semanas. No es un diagnóstico y no es atención de crisis ni terapia.",
      "Un chequeo puede pasar cosas por alto, así que confía en ti — si algo se siente mal, comunícate con una persona.",
      "Si estás pensando en hacerte daño, la ayuda está a un toque: puedes llamar o enviar un texto al 988 en cualquier momento."
    ],
    acknowledge: "Entiendo — comenzar el cuestionario"
  }
};

export function scorePhq9(itemResponses: number[]): { totalScore: number; severityBand: SeverityBand } {
  const totalScore = itemResponses.reduce((sum, value) => sum + value, 0);
  return { totalScore, severityBand: severityBandForScore(totalScore) };
}

function severityBandForScore(totalScore: number): SeverityBand {
  if (totalScore >= 20) return "severe";
  if (totalScore >= 15) return "moderately_severe";
  if (totalScore >= 10) return "moderate";
  if (totalScore >= 5) return "mild";
  return "minimal";
}

// FR-4: item 9 (self-harm) is a crisis signal on ANY non-zero response,
// independent of the total score.
export function phq9Item9IsPositive(itemResponses: number[]): boolean {
  return (itemResponses[8] ?? 0) > 0;
}

// Plain-language band summary — deliberately non-diagnostic.
export function severityBandSummary(band: SeverityBand, language: Language): string {
  const en: Record<SeverityBand, string> = {
    minimal: "Your answers suggest few or no signs this week.",
    mild: "Your answers suggest some mild signs this week.",
    moderate: "Your answers suggest a moderate level of signs this week.",
    moderately_severe: "Your answers suggest a fairly high level of signs this week.",
    severe: "Your answers suggest a high level of signs this week."
  };
  const es: Record<SeverityBand, string> = {
    minimal: "Tus respuestas sugieren pocas o ninguna señal esta semana.",
    mild: "Tus respuestas sugieren algunas señales leves esta semana.",
    moderate: "Tus respuestas sugieren un nivel moderado de señales esta semana.",
    moderately_severe: "Tus respuestas sugieren un nivel bastante alto de señales esta semana.",
    severe: "Tus respuestas sugieren un nivel alto de señales esta semana."
  };
  const followUp =
    language === "es"
      ? " Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
      : " This is a self-check, not a diagnosis. Sharing it with your care team can help.";
  return (language === "es" ? es[band] : en[band]) + followUp;
}
