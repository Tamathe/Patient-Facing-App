import type { ScreeningInstrument } from "./types";

export const PHQ9_INSTRUMENT: ScreeningInstrument = {
  id: "phq9",
  briefLabel: { en: "Mood check-in (PHQ-9)", es: "Chequeo de ánimo (PHQ-9)" },
  title: { en: "PHQ-9 mood check-in", es: "Chequeo de ánimo PHQ-9" },
  audience: "self",
  tier: 1,
  items: [
    {
      id: "phq9_1",
      kind: "choice",
      en: "Little interest or pleasure in doing things",
      es: "Poco interés o placer en hacer las cosas"
    },
    {
      id: "phq9_2",
      kind: "choice",
      en: "Feeling down, depressed, or hopeless",
      es: "Sentirse desanimado/a, deprimido/a o sin esperanza"
    },
    {
      id: "phq9_3",
      kind: "choice",
      en: "Trouble falling or staying asleep, or sleeping too much",
      es: "Problemas para dormir o quedarse dormido/a, o dormir demasiado"
    },
    {
      id: "phq9_4",
      kind: "choice",
      en: "Feeling tired or having little energy",
      es: "Sentirse cansado/a o con poca energía"
    },
    {
      id: "phq9_5",
      kind: "choice",
      en: "Poor appetite or overeating",
      es: "Poco apetito o comer en exceso"
    },
    {
      id: "phq9_6",
      kind: "choice",
      en: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
      es: "Sentirse mal consigo mismo/a — o sentir que es un fracaso o que ha decepcionado a su familia o a sí mismo/a"
    },
    {
      id: "phq9_7",
      kind: "choice",
      en: "Trouble concentrating on things, such as reading the newspaper or watching television",
      es: "Dificultad para concentrarse en cosas, como leer el periódico o ver televisión"
    },
    {
      id: "phq9_8",
      kind: "choice",
      en: "Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual",
      es: "Moverse o hablar tan despacio que otras personas lo podrían haber notado — o estar tan inquieto/a que se ha movido mucho más de lo normal"
    },
    {
      id: "phq9_9",
      kind: "choice",
      en: "Thoughts that you would be better off dead, or of hurting yourself in some way",
      es: "Pensamientos de que estaría mejor muerto/a o de hacerse daño de alguna manera",
      crisisOnPositive: true
    }
  ],
  defaultOptions: [
    { value: 0, en: "Not at all", es: "Para nada" },
    { value: 1, en: "Several days", es: "Varios días" },
    { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
    { value: 3, en: "Nearly every day", es: "Casi todos los días" }
  ],
  score: (responses) => {
    const totalScore = responses.reduce((sum, value) => sum + value, 0);
    const band =
      totalScore >= 20
        ? "severe"
        : totalScore >= 15
          ? "moderately_severe"
          : totalScore >= 10
            ? "moderate"
            : totalScore >= 5
              ? "mild"
              : "minimal";
    return { totalScore, band };
  },
  bands: ["minimal", "mild", "moderate", "moderately_severe", "severe"],
  bandSummaries: {
    minimal: {
      en: "Your answers suggest few or no signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
      es: "Tus respuestas sugieren pocas o ninguna señal esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
    },
    mild: {
      en: "Your answers suggest some mild signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
      es: "Tus respuestas sugieren algunas señales leves esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
    },
    moderate: {
      en: "Your answers suggest a moderate level of signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
      es: "Tus respuestas sugieren un nivel moderado de señales esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
    },
    moderately_severe: {
      en: "Your answers suggest a fairly high level of signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
      es: "Tus respuestas sugieren un nivel bastante alto de señales esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
    },
    severe: {
      en: "Your answers suggest a high level of signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
      es: "Tus respuestas sugieren un nivel alto de señales esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
    }
  },
  consent: {
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
  },
  recurrenceDays: 14,
  wordingVerified: true,
  licenseStatus: "clear",
  attribution: {
    en: "PHQ-9 Patient Health Questionnaire",
    es: "Cuestionario de salud del paciente PHQ-9"
  }
};
