import type { ScreeningInstrument } from "./types";

export const NIDA_SINGLE_INSTRUMENT: ScreeningInstrument = {
  id: "nida_single",
  title: { en: "NIDA drug-use check", es: "Chequeo de consumo de drogas NIDA" },
  audience: "self",
  tier: 0,
  items: [
    {
      id: "past_year_count",
      kind: "number",
      en: "How many times in the past year have you used an illegal drug or used a prescription medication for non-medical reasons (for example, because of the experience or feeling it caused)?",
      es: "¿Cuántas veces en el último año ha usado una droga ilegal o un medicamento recetado por razones no médicas (por ejemplo, por la experiencia o sensación que le causó)?",
      min: 0,
      max: 365,
      integer: true
    }
  ],
  score: (responses) => ({ totalScore: responses[0], band: responses[0] >= 1 ? "positive" : "negative" }),
  bands: ["negative", "positive"],
  bandSummaries: {
    negative: { en: "You did not report drug use in the past year. This check-in is not a diagnosis.", es: "No informaste consumo de drogas en el último año. Este chequeo no es un diagnóstico." },
    positive: { en: "You reported drug use in the past year. A private care-team conversation may help. This check-in is not a diagnosis.", es: "Informaste consumo de drogas en el último año. Una conversación privada con tu equipo de atención podría ayudar. Este chequeo no es un diagnóstico." }
  },
  consent: {
    en: { title: "Before this drug-use check", points: ["This optional check asks for a whole-number count from the past year.", "You choose if and when to share your answer."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de consumo de drogas", points: ["Este chequeo opcional pide un número entero del último año.", "Tú eliges si compartes tu respuesta y cuándo."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 90,
  wordingVerified: false,
  licenseStatus: "pending",
  attribution: {
    en: "NIDA Clinical Trials Network self-administered single-question drug screen; Smith PC et al., Arch Intern Med. 2010;170(13):1155–1160.",
    es: "Pregunta única autoadministrada sobre consumo de drogas de la Red de Ensayos Clínicos de NIDA; Smith PC et al., Arch Intern Med. 2010;170(13):1155–1160."
  }
};
