import type { ScreeningInstrument } from "./types";

export const GAD2_INSTRUMENT: ScreeningInstrument = {
  id: "gad2",
  title: { en: "GAD-2 anxiety check", es: "Chequeo de ansiedad GAD-2" },
  instructions: {
    en: "Over the last 2 weeks, how often have you been bothered by the following problems?",
    es: "Durante las últimas 2 semanas, ¿qué tan seguido ha tenido molestias debido a los siguientes problemas?"
  },
  audience: "self",
  tier: 0,
  items: [
    { id: "gad2_1", kind: "choice", en: "Feeling nervous, anxious or on edge", es: "Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta" },
    { id: "gad2_2", kind: "choice", en: "Not being able to stop or control worrying", es: "No ha sido capaz de parar o controlar su preocupación" }
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
    negative: { en: "Your answers did not reach the follow-up threshold today. This check-in is not a diagnosis.", es: "Tus respuestas no alcanzaron el umbral de seguimiento hoy. Este chequeo no es un diagnóstico." },
    positive: { en: "Your answers suggest a longer anxiety check could help. This check-in is not a diagnosis.", es: "Tus respuestas sugieren que un chequeo de ansiedad más largo podría ayudar. Este chequeo no es un diagnóstico." }
  },
  consent: {
    en: { title: "Before this anxiety check", points: ["This optional check asks about the last two weeks.", "It is a screening check, not a diagnosis."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de ansiedad", points: ["Este chequeo opcional pregunta sobre las últimas dos semanas.", "Es un chequeo de detección, no un diagnóstico."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 90,
  followUp: { minScore: 3, instrumentId: "gad7" },
  wordingVerified: true,
  licenseStatus: "clear",
  attribution: {
    en: "Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc.",
    es: "Desarrollado por los Dres. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke y colegas, con una subvención educativa de Pfizer Inc."
  }
};
