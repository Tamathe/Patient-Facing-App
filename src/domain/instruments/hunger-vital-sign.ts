import type { ScreeningInstrument } from "./types";

export const HUNGER_VITAL_SIGN_INSTRUMENT: ScreeningInstrument = {
  id: "hunger_vital_sign",
  title: { en: "Hunger Vital Sign", es: "Signo Vital del Hambre" },
  instructions: {
    en: "For each of the following statements, please tell me which one is ‘often true,’ ‘sometimes true’ or ‘never true’ for the past 12 months, that is since last [name of current month].",
    es: "Por cada una de las siguientes declaraciones, por favor indique si la declaracion se aplica a su familia ‘frecuentemente,’ ‘a veces’ o ‘nunca’ durante los últimos 12 meses, es decir desde [nombre del mes actual] del año pasado."
  },
  audience: "self",
  tier: 0,
  items: [
    { id: "hvs_1", kind: "choice", en: "We (I) worried whether our food would run out before we (I) got money to buy more", es: "Estábamos (Estaba) preocupado(s) de que los alimentos se acabaran antes de que tuviéramos (tuviera) suficiente dinero para comprar más." },
    { id: "hvs_2", kind: "choice", en: "The food that we (I) bought just didn't last and we (I) didn't have money to get more", es: "Los alimentos que compramos (compré) no duraron mucho y no teníamos (tenía) suficiente dinero para comprar más." }
  ],
  defaultOptions: [
    { value: 2, en: "Often true", es: "Frecuentemente" },
    { value: 1, en: "Sometimes true", es: "A veces" },
    { value: 0, en: "Never true", es: "Nunca" }
  ],
  score: (responses) => {
    const totalScore = Math.max(...responses);
    return { totalScore, band: totalScore >= 1 ? "positive" : "negative" };
  },
  bands: ["negative", "positive"],
  bandSummaries: {
    negative: { en: "You did not report food access concerns today. This check-in is not a diagnosis.", es: "No informaste inquietudes sobre el acceso a alimentos hoy. Este chequeo no es un diagnóstico." },
    positive: { en: "You reported a food access concern. Kentucky resources may be able to help. This check-in is not a diagnosis.", es: "Informaste una inquietud sobre el acceso a alimentos. Los recursos de Kentucky podrían ayudar. Este chequeo no es un diagnóstico." }
  },
  consent: {
    en: { title: "Before this food access check", points: ["This optional check asks about the past 12 months.", "Your answers can help find food resources."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de acceso a alimentos", points: ["Este chequeo opcional pregunta sobre los últimos 12 meses.", "Tus respuestas pueden ayudar a encontrar recursos de alimentos."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 90,
  wordingVerified: true,
  licenseStatus: "clear",
  attribution: {
    en: "Hunger Vital Sign, Children's HealthWatch; Hager ER et al., Pediatrics 2010;126(1):26–32.",
    es: "Signo Vital del Hambre, Children's HealthWatch; Hager ER et al., Pediatrics 2010;126(1):26–32."
  }
};
