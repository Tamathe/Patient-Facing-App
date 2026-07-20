// TRANSCRIPTION REQUIRED: verify items verbatim against the official PDF before demo
import type { ScreeningInstrument } from "./types";

export const PSC17_SUBSCALE_IDS = {
  internalizing: ["feels_sad", "feels_hopeless", "down_on_self", "less_fun", "worries_a_lot"],
  attention: ["fidgety", "daydreams_too_much", "trouble_concentrating", "driven_by_motor", "distracted_easily"],
  externalizing: [
    "refuses_to_share",
    "does_not_understand_feelings",
    "fights_with_children",
    "blames_others",
    "does_not_listen_to_rules",
    "teases_others",
    "takes_things"
  ]
} as const;

const ITEMS = [
  { id: "fidgety", en: "Fidgety, unable to sit still", es: "Es inquieto(a), incapaz de sentarse tranquilo(a)" },
  { id: "feels_sad", en: "Feels sad, unhappy", es: "Se siente triste, infeliz" },
  { id: "daydreams_too_much", en: "Daydreams too much", es: "Sueña despierto demasiado" },
  { id: "refuses_to_share", en: "Refuses to share", es: "Se niega a compartir" },
  { id: "does_not_understand_feelings", en: "Does not understand other people's feelings", es: "No comprende los sentimientos de otros" },
  { id: "feels_hopeless", en: "Feels hopeless", es: "Se siente sin esperanzas" },
  { id: "trouble_concentrating", en: "Has trouble concentrating", es: "Tiene problemas para concentrarse" },
  { id: "fights_with_children", en: "Fights with other children", es: "Pelea con otros niños" },
  { id: "down_on_self", en: "Is down on self", es: "Se siente mal de sí mismo(a)" },
  { id: "blames_others", en: "Blames others for his/her troubles", es: "Culpa a otros por sus problemas" },
  { id: "less_fun", en: "Seems to be having less fun", es: "Parece divertirse menos" },
  { id: "does_not_listen_to_rules", en: "Does not listen to rules", es: "No obedece las reglas" },
  { id: "driven_by_motor", en: "Acts as if driven by a motor", es: "Es muy activo(a), tiene mucha energía" },
  { id: "teases_others", en: "Teases others", es: "Molesta o se burla de otros" },
  { id: "worries_a_lot", en: "Worries a lot", es: "Se preocupa mucho" },
  { id: "takes_things", en: "Takes things that do not belong to him/her", es: "Toma cosas que no le pertenecen" },
  { id: "distracted_easily", en: "Distracted easily", es: "Se distrae fácilmente" }
].map((item) => ({ ...item, kind: "choice" as const }));

export type Psc17SubscaleScores = { internalizing: number; attention: number; externalizing: number };

export function scorePsc17Subscales(responses: number[]): Psc17SubscaleScores {
  if (responses.length !== ITEMS.length || responses.some((response) => !Number.isFinite(response))) {
    throw new RangeError("PSC-17 scoring requires all 17 responses.");
  }
  const byId = new Map(ITEMS.map(({ id }, index) => [id, responses[index]]));
  const sum = (ids: readonly string[]) => ids.reduce((total, id) => total + (byId.get(id) ?? 0), 0);
  return {
    internalizing: sum(PSC17_SUBSCALE_IDS.internalizing),
    attention: sum(PSC17_SUBSCALE_IDS.attention),
    externalizing: sum(PSC17_SUBSCALE_IDS.externalizing)
  };
}

export const PSC17_INSTRUMENT: ScreeningInstrument = {
  id: "psc17",
  title: { en: "PSC-17 child behavior check", es: "Chequeo de comportamiento infantil PSC-17" },
  audience: "caregiver",
  tier: 3,
  items: ITEMS,
  defaultOptions: [
    { value: 0, en: "Never", es: "Nunca" },
    { value: 1, en: "Sometimes", es: "Algunas Veces" },
    { value: 2, en: "Often", es: "Frecuentemente" }
  ],
  score: (responses) => {
    const totalScore = responses.slice(0, 17).reduce((sum, value) => sum + value, 0);
    const subscales = scorePsc17Subscales(responses);
    const discuss = totalScore >= 15 || subscales.internalizing >= 5 || subscales.attention >= 7 || subscales.externalizing >= 7;
    return { totalScore, band: discuss ? "discuss" : "lower_risk" };
  },
  bands: ["lower_risk", "discuss"],
  bandSummaries: {
    lower_risk: {
      en: "This score is below the PSC-17 total and subscale follow-up cutoffs. It is a check-in, not a diagnosis.",
      es: "Este puntaje está por debajo de los límites de seguimiento total y por subescalas de PSC-17. Es un chequeo, no un diagnóstico."
    },
    discuss: {
      en: "The total or a PSC-17 subscale meets a follow-up cutoff. Bring these results to your child's pediatrician. This is not a diagnosis.",
      es: "El total o una subescala de PSC-17 alcanza un límite de seguimiento. Lleva estos resultados al pediatra de tu hijo o hija. Esto no es un diagnóstico."
    }
  },
  consent: {
    en: {
      title: "Before this caregiver check",
      points: ["Answer all 17 items based on your child's behavior. This check does not make a diagnosis."],
      acknowledge: "I understand — start"
    },
    es: {
      title: "Antes de este chequeo para cuidadores",
      points: ["Responde los 17 elementos según el comportamiento de tu hijo o hija. Este chequeo no da un diagnóstico."],
      acknowledge: "Entiendo — comenzar"
    }
  },
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "Pediatric Symptom Checklist authors Michael Jellinek, MD, and J. Michael Murphy, EdD; Massachusetts General Hospital.",
    es: "Lista de Síntomas Pediátricos de M.S. Jellinek y J.M. Murphy, Massachusetts General Hospital."
  }
};
