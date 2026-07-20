import type { ScreeningInstrument } from "./types";

const YES_NO = [
  { value: 0, en: "No", es: "No" },
  { value: 1, en: "Yes", es: "Sí" }
];

export const STEADI3_INSTRUMENT: ScreeningInstrument = {
  id: "steadi3",
  title: { en: "STEADI falls check", es: "Chequeo de caídas STEADI" },
  audience: "self",
  tier: 2,
  items: [
    { id: "fallen", kind: "choice", en: "Have you fallen in the past year?", es: "He tenido una caída en el último año.", options: YES_NO },
    { id: "unsteady", kind: "choice", en: "Do you feel unsteady when standing or walking?", es: "A veces siento que no tengo estabilidad al caminar.", options: YES_NO },
    { id: "worried", kind: "choice", en: "Are you worried about falling?", es: "Me preocupa caerme.", options: YES_NO },
    {
      id: "injured",
      kind: "choice",
      en: "Were you hurt or injured when you fell?",
      es: "¿Se lastimó o lesionó cuando se cayó?",
      options: YES_NO,
      conditionalOn: { itemId: "fallen", atLeast: 1 },
      notApplicableValue: -1
    }
  ],
  score: (responses) => {
    const [fallen, unsteady, worried, injured] = responses;
    const totalScore = fallen + unsteady + worried + (injured === 1 ? 1 : 0);
    if (injured === 1) {
      return { totalScore, band: "fall_with_injury" };
    }
    return { totalScore, band: fallen === 1 || unsteady === 1 || worried === 1 ? "at_risk" : "lower_risk" };
  },
  bands: ["lower_risk", "at_risk", "fall_with_injury"],
  bandSummaries: {
    lower_risk: { en: "You answered no to the three core fall-risk questions.", es: "Respondió no a las tres preguntas principales sobre el riesgo de caídas." },
    at_risk: { en: "One or more answers may indicate increased fall risk. Falls-prevention support can help.", es: "Una o más respuestas pueden indicar un mayor riesgo de caídas. El apoyo para prevenir caídas puede ayudar." },
    fall_with_injury: { en: "You reported a fall with an injury. Contact a clinician now for guidance.", es: "Informó una caída con una lesión. Comuníquese ahora con un profesional clínico para recibir orientación." }
  },
  consent: {
    en: { title: "Before this falls check", points: ["This optional check asks three CDC STEADI questions.", "An injury follow-up and the urgency band are app policy."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de caídas", points: ["Este chequeo opcional usa tres elementos de materiales en español de CDC STEADI.", "La pregunta sobre lesiones y la banda de urgencia son política de la aplicación."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 365,
  eligibility: (state, now) => {
    const nowMs = now.valueOf();
    if (Number.isNaN(nowMs)) {
      return false;
    }
    return state.assessmentEvents.some((event) => {
      const recordedAtMs = new Date(event.recordedAt).valueOf();
      if (Number.isNaN(recordedAtMs) || recordedAtMs > nowMs) {
        return false;
      }
      const age = event.instrumentId === "lung_ldct_eligibility"
        ? event.itemResponses[1]
        : event.instrumentId === "crc_eligibility"
          ? event.itemResponses[0]
          : undefined;
      return age !== undefined && Number.isFinite(age) && age >= 65;
    });
  },
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "CDC STEADI (Stopping Elderly Accidents, Deaths & Injuries); Spanish wording comes from the 12-item Stay Independent form and is not a matched three-question translation.",
    es: "CDC STEADI (Detener los accidentes, las muertes y las lesiones en adultos mayores); la redacción en español proviene del formulario Mantenga su independencia de 12 elementos y no es una traducción equivalente de tres preguntas."
  }
};
