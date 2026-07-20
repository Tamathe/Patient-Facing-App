import type { ScreeningInstrument } from "./types";

export const TOBACCO_USE_INSTRUMENT: ScreeningInstrument = {
  id: "tobacco_use",
  title: { en: "Cigarette use check", es: "Chequeo del consumo de cigarrillos" },
  audience: "self",
  tier: 0,
  items: [
    {
      id: "current_use",
      kind: "choice",
      en: "Do you now smoke cigarettes every day, some days, or not at all?",
      es: "Actualmente, ¿fuma cigarrillos todos los días, algunos días o no fuma para nada?",
      options: [
        { value: 2, en: "Every day", es: "Todos los días" },
        { value: 1, en: "Some days", es: "Algunos días" },
        { value: 0, en: "Not at all", es: "Para nada" }
      ]
    },
    {
      id: "lifetime_100",
      kind: "choice",
      en: "Have you smoked at least 100 cigarettes in your entire life?",
      es: "¿Ha fumado al menos 100 cigarrillos en toda su vida?",
      options: [
        { value: 1, en: "Yes", es: "Sí" },
        { value: 0, en: "No", es: "No" }
      ],
      conditionalOn: { itemId: "current_use", atLeast: 0, atMost: 0 },
      notApplicableValue: -1
    }
  ],
  score: (responses) => {
    const currentUse = responses[0];
    return {
      totalScore: currentUse,
      band: currentUse >= 1 ? "current" : responses[1] === 1 ? "former" : "never"
    };
  },
  bands: ["never", "former", "current"],
  bandSummaries: {
    never: { en: "You did not report current or former cigarette use. This check-in is not a diagnosis.", es: "No informaste consumo actual ni anterior de cigarrillos. Este chequeo no es un diagnóstico." },
    former: { en: "You reported former cigarette use. This check-in is not a diagnosis.", es: "Informaste consumo anterior de cigarrillos. Este chequeo no es un diagnóstico." },
    current: { en: "You reported current cigarette use. Free quit support is available. This check-in is not a diagnosis.", es: "Informaste consumo actual de cigarrillos. Hay apoyo gratuito para dejar de fumar. Este chequeo no es un diagnóstico." }
  },
  consent: {
    en: { title: "Before this cigarette-use check", points: ["This optional check asks two cigarette-use questions.", "The app asks current use first; this is a product adaptation of the BRFSS order."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de cigarrillos", points: ["Este chequeo opcional hace dos preguntas sobre el consumo de cigarrillos.", "La aplicación pregunta primero sobre el consumo actual; esta es una adaptación del orden de BRFSS."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 90,
  wordingVerified: true,
  licenseStatus: "clear",
  attribution: {
    en: "Product-adapted administration of CDC Behavioral Risk Factor Surveillance System cigarette items (2023 English; 2020 draft Spanish).",
    es: "Administración adaptada por el producto de preguntas sobre cigarrillos del Sistema de Vigilancia de Factores de Riesgo del Comportamiento de los CDC (inglés 2023; borrador en español 2020)."
  }
};
