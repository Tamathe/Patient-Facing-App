import type { ScreeningInstrument } from "./types";

const YES_NO = [
  { value: 0, en: "No", es: "No" },
  { value: 1, en: "Yes", es: "Sí" }
];

export function bmiFrom(heightIn: number, weightLb: number): number {
  return 703 * weightLb / heightIn ** 2;
}

function bmiPoints(bmi: number): number {
  if (bmi >= 40) {
    return 3;
  }
  if (bmi >= 30) {
    return 2;
  }
  if (bmi >= 25) {
    return 1;
  }
  return 0;
}

export const PREDIABETES_RISK_INSTRUMENT: ScreeningInstrument = {
  id: "prediabetes_risk",
  title: { en: "Prediabetes risk test", es: "Prueba de riesgo de prediabetes" },
  instructions: {
    en: "Add the points for each answer. Only a blood test can diagnose prediabetes.",
    es: "Sume los puntos de cada respuesta. Solo un análisis de sangre puede diagnosticar la prediabetes."
  },
  audience: "self",
  tier: 2,
  items: [
    {
      id: "age_points",
      kind: "choice",
      en: "How old are you?",
      es: "¿Qué edad tiene?",
      options: [
        { value: 0, en: "Under 40", es: "Menor de 40" },
        { value: 1, en: "40–49", es: "40 a 49" },
        { value: 2, en: "50–59", es: "50 a 59" },
        { value: 3, en: "60 or older", es: "60 o más" }
      ]
    },
    {
      id: "sex_points",
      kind: "choice",
      en: "Are you a man or a woman?",
      es: "¿Es hombre o mujer?",
      options: [
        { value: 1, en: "Man", es: "Hombre" },
        { value: 0, en: "Woman", es: "Mujer" }
      ]
    },
    {
      id: "gestational_diabetes",
      kind: "choice",
      en: "If you are a woman, have you ever been diagnosed with gestational diabetes?",
      es: "Si es mujer, ¿le diagnosticaron alguna vez diabetes gestacional?",
      options: YES_NO,
      conditionalOn: { itemId: "sex_points", atLeast: 0, atMost: 0 },
      notApplicableValue: 0
    },
    { id: "family_history", kind: "choice", en: "Do you have a mother, father, sister, or brother with diabetes?", es: "¿Tiene diabetes su madre, padre, algún hermano o hermana?", options: YES_NO },
    { id: "high_blood_pressure", kind: "choice", en: "Have you ever been diagnosed with high blood pressure?", es: "¿Le diagnosticaron alguna vez presión arterial alta?", options: YES_NO },
    {
      id: "inactive_points",
      kind: "choice",
      en: "Are you physically active?",
      es: "¿Se mantiene físicamente activo?",
      options: [
        { value: 0, en: "Yes", es: "Sí" },
        { value: 1, en: "No", es: "No" }
      ]
    },
    { id: "height_in", kind: "number", en: "What is your height in inches?", es: "¿Cuál es su estatura en pulgadas?", min: 36, max: 96 },
    { id: "weight_lb", kind: "number", en: "What is your weight in pounds?", es: "¿Cuál es su peso en libras?", min: 50, max: 1000 }
  ],
  score: (responses) => {
    const [age, sex, gestationalDiabetes, familyHistory, highBloodPressure, inactive, heightIn, weightLb] = responses;
    const totalScore = age + sex + gestationalDiabetes + familyHistory + highBloodPressure + inactive +
      bmiPoints(bmiFrom(heightIn, weightLb));
    return { totalScore, band: totalScore >= 5 ? "high_risk" : "lower_risk" };
  },
  bands: ["lower_risk", "high_risk"],
  bandSummaries: {
    lower_risk: { en: "Your score is below the high-risk cutoff. Only a blood test can diagnose prediabetes.", es: "Su puntuación está por debajo del límite de alto riesgo. Solo un análisis de sangre puede diagnosticar la prediabetes." },
    high_risk: { en: "Your score is in the high-risk range. Only a blood test can diagnose prediabetes.", es: "Su puntuación está en el rango de alto riesgo. Solo un análisis de sangre puede diagnosticar la prediabetes." }
  },
  consent: {
    en: { title: "Before this prediabetes risk test", points: ["This optional test uses CDC and ADA risk factors.", "This app calculates raw BMI from height and weight instead of reproducing the paper form's rounded-pound chart."], acknowledge: "I understand — start" },
    es: { title: "Antes de esta prueba de riesgo de prediabetes", points: ["Esta prueba opcional usa factores de riesgo de los CDC y la ADA.", "Esta aplicación calcula el IMC sin redondear a partir de la estatura y el peso en vez de reproducir la tabla de libras redondeadas del formulario impreso."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 365,
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "Risk Test provided by the American Diabetes Association and the Centers for Disease Control and Prevention; raw-BMI scoring is a locked product operationalization.",
    es: "Prueba de riesgo provista por la Asociación Americana de la Diabetes y los Centros para el Control y la Prevención de Enfermedades; la puntuación con IMC sin redondear es una operacionalización fijada del producto."
  }
};
