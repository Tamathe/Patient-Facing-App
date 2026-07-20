import type { ScreeningInstrument } from "./types";

const YES_NO = [
  { value: 0, en: "No", es: "No" },
  { value: 1, en: "Yes", es: "Sí" }
];

export const CRC_ELIGIBILITY_INSTRUMENT: ScreeningInstrument = {
  id: "crc_eligibility",
  title: { en: "Colorectal screening check", es: "Chequeo de detección colorrectal" },
  instructions: {
    en: "These questions help identify whether to discuss routine screening or contact a clinician now.",
    es: "Estas preguntas ayudan a identificar si debe conversar sobre la detección rutinaria o comunicarse con un profesional clínico ahora."
  },
  audience: "self",
  tier: 2,
  items: [
    { id: "age", kind: "number", en: "How old are you?", es: "¿Qué edad tiene?", min: 18, max: 120, integer: true },
    { id: "recent_colonoscopy", kind: "choice", en: "Have you had a colonoscopy in the last 10 years?", es: "¿Se ha hecho una colonoscopia en los últimos 10 años?", options: YES_NO },
    { id: "recent_fit", kind: "choice", en: "Have you had a FIT stool test in the last year?", es: "¿Se ha hecho una prueba FIT de heces en el último año?", options: YES_NO },
    {
      id: "recent_other_modality",
      kind: "choice",
      en: "Have you had another colon screening test — like a stool-DNA (Cologuard) test in the last 3 years, or a sigmoidoscopy or CT colonography in the last 5 years?",
      es: "¿Se ha hecho otra prueba de detección de colon — como una prueba de ADN en heces (Cologuard) en los últimos 3 años, o una sigmoidoscopia o colonografía por tomografía computarizada en los últimos 5 años?",
      options: YES_NO
    },
    { id: "red_flags", kind: "choice", en: "Do you have rectal bleeding, iron-deficiency anemia, or a new change in bowel habits?", es: "¿Tiene sangrado rectal, anemia por deficiencia de hierro o un cambio nuevo en los hábitos intestinales?", options: YES_NO },
    { id: "family_history", kind: "choice", en: "Has a parent, brother, sister, or child had colorectal cancer?", es: "¿Su madre, padre, hermano, hermana, hijo o hija ha tenido cáncer colorrectal?", options: YES_NO }
  ],
  score: (responses) => {
    const [age, recentColonoscopy, recentFit, recentOtherModality, redFlags, familyHistory] = responses;
    const totalScore = recentColonoscopy + recentFit + recentOtherModality + redFlags + familyHistory;
    if (redFlags === 1 || familyHistory === 1) {
      return { totalScore, band: "see_clinician_now" };
    }
    const due = age >= 45 && age <= 75 && recentColonoscopy === 0 && recentFit === 0 && recentOtherModality === 0;
    return { totalScore, band: due ? "due" : "not_due" };
  },
  bands: ["not_due", "due", "see_clinician_now"],
  bandSummaries: {
    not_due: { en: "Your answers do not indicate that routine colorectal screening is due under this app's locked criteria.", es: "Sus respuestas no indican que la detección colorrectal rutinaria corresponda según los criterios fijados de esta aplicación." },
    due: { en: "Your answers indicate that it is time to discuss colorectal screening with a clinician.", es: "Sus respuestas indican que es momento de conversar sobre la detección colorrectal con un profesional clínico." },
    see_clinician_now: { en: "Your symptoms or family history should be discussed with a clinician now instead of using a routine screening pathway.", es: "Debe conversar ahora con un profesional clínico sobre sus síntomas o antecedentes familiares, en vez de usar una vía de detección rutinaria." }
  },
  consent: {
    en: { title: "Before this colorectal screening check", points: ["This optional check asks about age, recent screening, symptoms, and family history.", "It does not diagnose colorectal cancer."], acknowledge: "I understand — start" },
    es: { title: "Antes de este chequeo de detección colorrectal", points: ["Este chequeo opcional pregunta sobre la edad, pruebas recientes, síntomas y antecedentes familiares.", "No diagnostica el cáncer colorrectal."], acknowledge: "Entiendo — comenzar" }
  },
  recurrenceDays: 365,
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "Product operationalization of the 2021 USPSTF colorectal cancer screening recommendation; family-history routing and the age 76 cutoff are conservative app policy.",
    es: "Operacionalización del producto de la recomendación de detección de cáncer colorrectal de USPSTF de 2021; la ruta por antecedentes familiares y el límite a los 76 años son política conservadora de la aplicación."
  }
};
