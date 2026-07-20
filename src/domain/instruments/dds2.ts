import type { ScreeningInstrument } from "./types";

export function dds2Band(mean: number): "lower_distress" | "elevated_distress" {
  return mean >= 3 ? "elevated_distress" : "lower_distress";
}

export const DDS2_INSTRUMENT: ScreeningInstrument = {
  id: "dds2",
  title: { en: "Diabetes Distress Scale (DDS-2)", es: "Escala de angustia por diabetes (DDS-2)" },
  instructions: {
    en: "During the past month, to what degree did each item bother or distress you?",
    es: "Durante el último mes, ¿en qué medida le molestó o angustió cada situación?"
  },
  audience: "self",
  tier: 2,
  items: [
    { id: "overwhelmed", kind: "choice", en: "Feeling overwhelmed by the demands of living with diabetes.", es: "Sentirse abrumado(a) por la atención que requiere vivir con la diabetes." },
    { id: "failing_regimen", kind: "choice", en: "Feeling that I am often failing with my diabetes regimen.", es: "Sentir que fracaso a menudo con mi régimen de diabetes." }
  ],
  defaultOptions: [
    { value: 1, en: "Not a Problem", es: "No es un problema" },
    { value: 2, en: "A Slight Problem", es: "Es un pequeño problema" },
    { value: 3, en: "A Moderate Problem", es: "Es un problema moderado" },
    { value: 4, en: "Somewhat Serious Problem", es: "Es un problema algo grave" },
    { value: 5, en: "A Serious Problem", es: "Es un problema grave" },
    { value: 6, en: "A Very Serious Problem", es: "Es un problema muy grave" }
  ],
  score: (responses) => {
    const totalScore = (responses[0] + responses[1]) / 2;
    return { totalScore, band: dds2Band(totalScore) };
  },
  bands: ["lower_distress", "elevated_distress"],
  bandSummaries: {
    lower_distress: { en: "Your average is below the elevated diabetes-distress cutoff. This is not a depression screen or diagnosis.", es: "Su promedio está por debajo del límite de angustia elevada por diabetes. Esto no es un chequeo ni diagnóstico de depresión." },
    elevated_distress: { en: "You reported elevated diabetes distress. Diabetes-specific support may help; this is not a depression or psychiatric diagnosis.", es: "Informó angustia elevada por diabetes. El apoyo específico para la diabetes puede ayudar; esto no es un diagnóstico de depresión ni psiquiátrico." }
  },
  consent: {
    en: { title: "Before this diabetes distress check", points: ["This optional check asks about the past month.", "It measures diabetes distress, not depression."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de angustia por diabetes", points: ["Este chequeo opcional pregunta sobre el último mes.", "Mide la angustia por diabetes, no la depresión."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 365,
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "DDS-2: Fisher, Glasgow, Mullan, Skaff, and Polonsky. DDS 12.1.17 © Behavioral Diabetes Institute. Free for nonprofit clinical/research use; commercial use requires a license.",
    es: "DDS-2: Fisher, Glasgow, Mullan, Skaff y Polonsky. DDS 12.1.17 © Behavioral Diabetes Institute. Gratuita para uso clínico o de investigación sin fines de lucro; el uso comercial requiere licencia."
  }
};
