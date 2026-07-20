import type { ScreeningInstrument } from "./types";

export const PHQ2_INSTRUMENT: ScreeningInstrument = {
  id: "phq2",
  title: { en: "PHQ-2 mood check", es: "Chequeo de ánimo PHQ-2" },
  instructions: {
    en: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
    es: "Durante las últimas 2 semanas, ¿qué tan seguido ha tenido molestias debido a los siguientes problemas?"
  },
  audience: "self",
  tier: 0,
  items: [
    { id: "phq2_1", kind: "choice", en: "Little interest or pleasure in doing things", es: "Poco interés o placer en hacer cosas" },
    { id: "phq2_2", kind: "choice", en: "Feeling down, depressed, or hopeless", es: "Se ha sentido decaído(a), deprimido(a) o sin esperanzas" }
  ],
  defaultOptions: [
    { value: 0, en: "Not at all", es: "Ningún día" },
    { value: 1, en: "Several days", es: "Varios días" },
    { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
    { value: 3, en: "Nearly every day", es: "Casi todos los días" }
  ],
  score: (responses) => {
    const totalScore = responses.reduce((sum, value) => sum + value, 0);
    return { totalScore, band: totalScore >= 3 ? "positive" : "negative" };
  },
  bands: ["negative", "positive"],
  bandSummaries: {
    negative: {
      en: "Your answers did not reach the follow-up threshold today. This check-in is not a diagnosis.",
      es: "Tus respuestas no alcanzaron el umbral de seguimiento hoy. Este chequeo no es un diagnóstico."
    },
    positive: {
      en: "Your answers suggest a longer mood check could help. This check-in is not a diagnosis.",
      es: "Tus respuestas sugieren que un chequeo de ánimo más largo podría ayudar. Este chequeo no es un diagnóstico."
    }
  },
  consent: {
    en: { title: "Before this mood check", points: ["This optional check asks about the last two weeks.", "It is a screening check, not a diagnosis."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de ánimo", points: ["Este chequeo opcional pregunta sobre las últimas dos semanas.", "Es un chequeo de detección, no un diagnóstico."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 90,
  followUp: { minScore: 3, instrumentId: "phq9" },
  wordingVerified: true,
  licenseStatus: "clear",
  attribution: {
    en: "Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc.",
    es: "Desarrollado por los Dres. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke y colegas, con una subvención educativa de Pfizer Inc."
  }
};
