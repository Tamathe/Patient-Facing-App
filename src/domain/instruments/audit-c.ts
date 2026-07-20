import type { ScreeningInstrument } from "./types";

export const AUDIT_C_PRIVACY = {
  en: "Your answers stay on this device. You choose if and when to share them.",
  es: "Tus respuestas permanecen en este dispositivo. Tú eliges si las compartes y cuándo."
} as const;

export const AUDIT_C_WITHDRAWAL_WARNING = {
  en: "Cutting back suddenly after heavy drinking can be dangerous. Talk with a clinician about a safe plan first.",
  es: "Reducir de golpe el consumo después de beber mucho puede ser peligroso. Primero habla con un profesional clínico sobre un plan seguro."
} as const;

const FREQUENCY_OPTIONS = [
  { value: 0, en: "Never", es: "Nunca" },
  { value: 1, en: "Monthly or less", es: "Una o menos veces al mes" },
  { value: 2, en: "2 to 4 times per month", es: "De 2 a 4 veces al mes" },
  { value: 3, en: "2 to 3 times per week", es: "De 2 a 3 veces a la semana" },
  { value: 4, en: "4 or more times per week", es: "4 o más veces a la semana" }
];

const BINGE_FREQUENCY_OPTIONS = [
  { value: 0, en: "Never", es: "Nunca" },
  { value: 1, en: "Less than monthly", es: "Menos de una vez al mes" },
  { value: 2, en: "Monthly", es: "Mensualmente" },
  { value: 3, en: "Weekly", es: "Semanalmente" },
  { value: 4, en: "Daily or almost daily", es: "A diario o casi a diario" }
];

export const AUDIT_C_INSTRUMENT: ScreeningInstrument = {
  id: "audit_c",
  title: { en: "AUDIT-C alcohol check", es: "Chequeo de alcohol AUDIT-C" },
  instructions: { en: `Think about the past year. ${AUDIT_C_PRIVACY.en}`, es: `Piense en el último año. ${AUDIT_C_PRIVACY.es}` },
  audience: "self",
  tier: 2,
  items: [
    {
      id: "sex_at_birth",
      kind: "choice",
      en: "What was your sex at birth?",
      es: "¿Cuál fue su sexo al nacer?",
      options: [
        { value: 1, en: "Male", es: "Masculino" },
        { value: 0, en: "Female", es: "Femenino" }
      ]
    },
    { id: "frequency", kind: "choice", en: "How often did you have a drink containing alcohol in the past year?", es: "¿Con qué frecuencia consume alguna bebida alcohólica?", options: FREQUENCY_OPTIONS },
    {
      id: "typical_quantity",
      kind: "choice",
      en: "On days in the past year when you drank alcohol how many drinks did you typically drink?",
      es: "¿Cuántas consumiciones de bebidas alcohólicas suele realizar en un día de consumo normal?",
      options: [
        { value: 0, en: "0, 1, or 2", es: "1 o 2" },
        { value: 1, en: "3 or 4", es: "3 o 4" },
        { value: 2, en: "5 or 6", es: "5 o 6" },
        { value: 3, en: "7–9", es: "De 7 a 9" },
        { value: 4, en: "10 or more", es: "10 o más" }
      ]
    },
    {
      id: "heavy_occasion",
      kind: "choice",
      en: "How often did you have 6 or more (for men) or 4 or more (for women and everyone 65 and older) drinks on an occasion in the past year?",
      es: "¿Con qué frecuencia toma 6 o más bebidas alcohólicas en un solo día?",
      options: BINGE_FREQUENCY_OPTIONS
    }
  ],
  score: (responses) => {
    const [sexAtBirth, ...auditResponses] = responses;
    const totalScore = auditResponses.reduce((sum, response) => sum + response, 0);
    if (totalScore >= 10) {
      return { totalScore, band: "high_risk" };
    }
    const positiveThreshold = sexAtBirth === 1 ? 4 : 3;
    return { totalScore, band: totalScore >= positiveThreshold ? "positive" : "negative" };
  },
  bands: ["negative", "positive", "high_risk"],
  bandSummaries: {
    negative: { en: "Your score is below this app's positive cutoff. This check is not a diagnosis.", es: "Su puntuación está por debajo del límite positivo de esta aplicación. Este chequeo no es un diagnóstico." },
    positive: { en: "Your score reached this app's positive cutoff. Consider talking with a clinician.", es: "Su puntuación alcanzó el límite positivo de esta aplicación. Considere hablar con un profesional clínico." },
    high_risk: { en: "Your score is in this app's high-risk band. This check is not a diagnosis.", es: "Su puntuación está en la banda de alto riesgo de esta aplicación. Este chequeo no es un diagnóstico." }
  },
  consent: {
    en: { title: "Before this alcohol check", points: ["This optional check asks about alcohol use in the past year.", AUDIT_C_PRIVACY.en], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de alcohol", points: ["Este chequeo opcional pregunta sobre el consumo de alcohol durante el último año.", AUDIT_C_PRIVACY.es], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 365,
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "Alcohol Use Disorders Identification Test—Consumption (AUDIT-C), derived from the WHO AUDIT; sex cutoff and 10–12 high-risk band are locked app policy. Noncommercial demo use; confirm commercial permissions.",
    es: "Prueba de Identificación de los Trastornos Debidos al Consumo de Alcohol—Consumo (AUDIT-C), derivada de AUDIT de la OMS; el límite por sexo y la banda de alto riesgo de 10–12 son política fijada de la aplicación. Uso de demostración no comercial; confirme los permisos comerciales."
  }
};
