import type { ScreeningInstrument } from "./types";

const YES_NO = [
  { value: 0, en: "No", es: "No" },
  { value: 1, en: "Yes", es: "Sí" }
];

export function packYears(packsPerDay: number, yearsSmoked: number): number {
  return packsPerDay * yearsSmoked;
}

export const LUNG_LDCT_ELIGIBILITY_INSTRUMENT: ScreeningInstrument = {
  id: "lung_ldct_eligibility",
  title: { en: "Lung screening eligibility", es: "Elegibilidad para detección de cáncer de pulmón" },
  instructions: {
    en: "These questions apply screening criteria and do not diagnose lung cancer.",
    es: "Estas preguntas aplican criterios de detección y no diagnostican el cáncer de pulmón."
  },
  audience: "self",
  tier: 2,
  items: [
    {
      id: "smoking_status",
      kind: "choice",
      en: "Do you currently smoke cigarettes, or did you smoke cigarettes in the past?",
      es: "¿Fuma cigarrillos actualmente o fumó cigarrillos en el pasado?",
      options: [
        { value: 1, en: "I currently smoke", es: "Fumo actualmente" },
        { value: 0, en: "I used to smoke", es: "Fumaba antes" }
      ]
    },
    { id: "age", kind: "number", en: "How old are you?", es: "¿Qué edad tiene?", min: 18, max: 120, integer: true },
    { id: "packs_per_day", kind: "number", en: "On average, how many packs of cigarettes did you smoke per day?", es: "En promedio, ¿cuántas cajetillas de cigarrillos fumaba al día?", min: 0, max: 10 },
    { id: "years_smoked", kind: "number", en: "For how many years did you smoke?", es: "¿Durante cuántos años fumó?", min: 0, max: 100, integer: true },
    {
      id: "months_since_quit",
      kind: "number",
      en: "How many full months ago did you quit smoking?",
      es: "¿Hace cuántos meses completos dejó de fumar?",
      min: 0,
      max: 1200,
      integer: true,
      conditionalOn: { itemId: "smoking_status", atLeast: 0, atMost: 0 },
      notApplicableValue: -1
    },
    {
      id: "warning_symptoms",
      kind: "choice",
      en: "Have you coughed up blood or lost weight without trying?",
      es: "¿Ha tosido sangre o bajado de peso sin intentarlo?",
      options: YES_NO
    }
  ],
  score: (responses) => {
    const [smokingStatus, age, packsPerDay, yearsSmoked, monthsSinceQuit, warningSymptoms] = responses;
    const totalScore = packYears(packsPerDay, yearsSmoked);
    if (warningSymptoms === 1) {
      return { totalScore, band: "see_clinician_now" };
    }
    const smokingHistoryEligible = smokingStatus === 1 || (smokingStatus === 0 && monthsSinceQuit <= 180);
    const eligible = age >= 50 && age <= 80 && totalScore >= 20 && smokingHistoryEligible;
    return { totalScore, band: eligible ? "eligible" : "not_eligible" };
  },
  bands: ["not_eligible", "eligible", "see_clinician_now"],
  bandSummaries: {
    not_eligible: { en: "Your answers do not meet this app's routine lung screening criteria.", es: "Sus respuestas no cumplen los criterios de esta aplicación para la detección rutinaria de pulmón." },
    eligible: { en: "Your answers meet this app's criteria for a yearly low-dose CT conversation.", es: "Sus respuestas cumplen los criterios de esta aplicación para conversar sobre una tomografía de dosis baja anual." },
    see_clinician_now: { en: "A symptom you reported needs a clinician's attention now, rather than routine screening scheduling.", es: "Un síntoma que informó necesita atención clínica ahora, en vez de programar una detección rutinaria." }
  },
  consent: {
    en: { title: "Before this lung screening check", points: ["This optional check asks about age, cigarette history, and two warning symptoms.", "A clinician confirms whether screening is right for you."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de pulmón", points: ["Este chequeo opcional pregunta sobre la edad, el historial de cigarrillos y dos síntomas de advertencia.", "Un profesional clínico confirma si la detección es adecuada para usted."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 365,
  eligibility: (state, now) => {
    const nowMs = now.valueOf();
    if (Number.isNaN(nowMs)) {
      return false;
    }
    const latest = state.assessmentEvents.reduce<{ recordedAtMs: number; severityBand: string } | null>(
      (current, event) => {
        if (event.instrumentId !== "tobacco_use") {
          return current;
        }
        const recordedAtMs = new Date(event.recordedAt).valueOf();
        if (Number.isNaN(recordedAtMs) || recordedAtMs > nowMs || (current && current.recordedAtMs >= recordedAtMs)) {
          return current;
        }
        return { recordedAtMs, severityBand: event.severityBand };
      },
      null
    );
    return latest?.severityBand === "current" || latest?.severityBand === "former";
  },
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "Product operationalization of the 2021 USPSTF lung cancer screening recommendation; the 180-month inclusion boundary is locked app policy.",
    es: "Operacionalización del producto de la recomendación de detección de cáncer de pulmón de USPSTF de 2021; el límite inclusivo de 180 meses es política fijada de la aplicación."
  }
};
