import type { ScreeningInstrument } from "./types";

export const GAD7_INSTRUMENT: ScreeningInstrument = {
  id: "gad7",
  title: { en: "GAD-7 anxiety check", es: "Chequeo de ansiedad GAD-7" },
  instructions: {
    en: "Over the last 2 weeks, how often have you been bothered by the following problems?",
    es: "Durante las últimas 2 semanas, ¿qué tan seguido ha tenido molestias debido a los siguientes problemas?"
  },
  audience: "self",
  tier: 1,
  items: [
    { id: "gad7_1", kind: "choice", en: "Feeling nervous, anxious or on edge", es: "Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta" },
    { id: "gad7_2", kind: "choice", en: "Not being able to stop or control worrying", es: "No ha sido capaz de parar o controlar su preocupación" },
    { id: "gad7_3", kind: "choice", en: "Worrying too much about different things", es: "Se ha preocupado demasiado por motivos diferentes" },
    { id: "gad7_4", kind: "choice", en: "Trouble relaxing", es: "Ha tenido dificultad para relajarse" },
    { id: "gad7_5", kind: "choice", en: "Being so restless that it is hard to sit still", es: "Se ha sentido tan inquieto(a) que no ha podido quedarse quieto(a)" },
    { id: "gad7_6", kind: "choice", en: "Becoming easily annoyed or irritable", es: "Se ha molestado o irritado fácilmente" },
    { id: "gad7_7", kind: "choice", en: "Feeling afraid as if something awful might happen", es: "Ha tenido miedo de que algo terrible fuera a pasar" }
  ],
  defaultOptions: [
    { value: 0, en: "Not at all", es: "Ningún día" },
    { value: 1, en: "Several days", es: "Varios días" },
    { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
    { value: 3, en: "Nearly every day", es: "Casi todos los días" }
  ],
  score: (responses) => {
    const totalScore = responses.reduce((sum, value) => sum + value, 0);
    const band = totalScore >= 15 ? "severe" : totalScore >= 10 ? "moderate" : totalScore >= 5 ? "mild" : "minimal";
    return { totalScore, band };
  },
  bands: ["minimal", "mild", "moderate", "severe"],
  bandSummaries: {
    minimal: { en: "Your answers suggest minimal anxiety symptoms. This check-in is not a diagnosis.", es: "Tus respuestas sugieren síntomas mínimos de ansiedad. Este chequeo no es un diagnóstico." },
    mild: { en: "Your answers suggest mild anxiety symptoms. This check-in is not a diagnosis.", es: "Tus respuestas sugieren síntomas leves de ansiedad. Este chequeo no es un diagnóstico." },
    moderate: { en: "Your answers suggest moderate anxiety symptoms. This check-in is not a diagnosis.", es: "Tus respuestas sugieren síntomas moderados de ansiedad. Este chequeo no es un diagnóstico." },
    severe: { en: "Your answers suggest severe anxiety symptoms. This check-in is not a diagnosis.", es: "Tus respuestas sugieren síntomas graves de ansiedad. Este chequeo no es un diagnóstico." }
  },
  consent: {
    en: { title: "Before this anxiety check", points: ["This optional check asks about the last two weeks.", "It is a screening check, not a diagnosis."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de ansiedad", points: ["Este chequeo opcional pregunta sobre las últimas dos semanas.", "Es un chequeo de detección, no un diagnóstico."], acknowledge: "Entiendo — comenzar" }
  },
  wordingVerified: true,
  licenseStatus: "clear",
  attribution: {
    en: "Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc.",
    es: "Desarrollado por los Dres. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke y colegas, con una subvención educativa de Pfizer Inc."
  }
};
