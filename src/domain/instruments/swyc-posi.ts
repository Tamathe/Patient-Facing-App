// TRANSCRIPTION REQUIRED: verify items verbatim against the official PDF before demo
import type { InstrumentItem, ScreeningInstrument } from "./types";

const ALWAYS_OPTIONS = [
  { value: 0, en: "Always", es: "Siempre", score: 0 as const },
  { value: 1, en: "Usually", es: "Usualmente", score: 0 as const },
  { value: 2, en: "Sometimes", es: "Algunas Veces", score: 1 as const },
  { value: 3, en: "Rarely", es: "Rara Vez", score: 1 as const },
  { value: 4, en: "Never", es: "Nunca", score: 1 as const }
];

const POSI_ITEMS: InstrumentItem[] = [
  {
    id: "brings_to_show",
    kind: "choice",
    en: "Does your child bring things to you to show them to you?",
    es: "¿Su niño/a le trae cosas para mostrárselas a usted?",
    options: [
      { value: 0, en: "Many times a day", es: "Muchas veces al día", score: 0 },
      { value: 1, en: "A few times a day", es: "Algunas veces al día", score: 0 },
      { value: 2, en: "A few times a week", es: "Algunas veces a la semana", score: 1 },
      { value: 3, en: "Less than once a week", es: "Menos de una vez a la semana", score: 1 },
      { value: 4, en: "Never", es: "Nunca", score: 1 }
    ]
  },
  {
    id: "plays_with_children",
    kind: "choice",
    en: "Is your child interested in playing with other children?",
    es: "¿Su niño/a tiene interés en jugar con otros niños/as?",
    options: ALWAYS_OPTIONS
  },
  {
    id: "copies",
    kind: "choice",
    en: "When you say a word or wave your hand, will your child try to copy you?",
    es: "¿Cuándo usted dice una palabra o saluda con la mano, su niño/a trata de imitarlo?",
    options: ALWAYS_OPTIONS
  },
  {
    id: "responds_to_name",
    kind: "choice",
    en: "Does your child look at you when you call his or her name?",
    es: "¿Su niño/a lo mira cuando lo llama por su nombre?",
    options: ALWAYS_OPTIONS
  },
  {
    id: "follows_point",
    kind: "choice",
    en: "Does your child look if you point to something across the room?",
    es: "¿Si usted apunta o señala algo al otro lado del cuarto, su niño/a lo mira?",
    options: ALWAYS_OPTIONS
  },
  {
    id: "shows_wants",
    kind: "multi_choice",
    allowEmpty: true,
    en: "How does your child usually show you something he or she wants? (Please check all that apply)",
    es: "En general, ¿cómo le demuestra su niño/a que quiere algo? (Por favor marque todo lo que corresponda)",
    options: [
      { value: 1, en: "Says a word for what he or she wants", es: "Dice una palabra para describir lo que quiere", score: 0 },
      { value: 2, en: "Points to it with one finger", es: "Apunta con un dedo", score: 0 },
      { value: 4, en: "Reaches for it", es: "Trata de alcanzarlo", score: 1 },
      { value: 8, en: "Pulls me over or puts my hand on it", es: "Me hala o pone mi mano sobre el objeto", score: 1 },
      { value: 16, en: "Grunts, cries or screams", es: "Gruñe, llora, o grita", score: 1 }
    ]
  },
  {
    id: "favorite_play",
    kind: "multi_choice",
    allowEmpty: true,
    en: "What are your child's favorite play activities? (Please check all that apply)",
    es: "¿Cuáles son los juegos favoritos de su niño/a? (Por favor marque todo lo que corresponda)",
    options: [
      { value: 1, en: "Playing with dolls or stuffed animals", es: "Jugar con muñecas o peluches", score: 0 },
      { value: 2, en: "Reading books with you", es: "Leer libros con usted", score: 0 },
      { value: 4, en: "Climbing, running and being active", es: "Trepar, correr y estar activo", score: 1 },
      { value: 8, en: "Lining up toys or other things", es: "Acomodar juguetes u otras cosas en línea", score: 1 },
      { value: 16, en: "Watching things go round and round like fans or wheels", es: "Ver cosas que giran y dan vueltas, por ejemplo ventiladores o ruedas", score: 1 }
    ]
  }
];

function rowScore(item: InstrumentItem, response: number): number {
  const options = item.options ?? [];
  if (item.kind === "multi_choice") {
    return options.some(({ value, score }) => score === 1 && (response & value) !== 0) ? 1 : 0;
  }
  return options.find(({ value }) => value === response)?.score ?? 0;
}

export const SWYC_POSI_INSTRUMENT: ScreeningInstrument = {
  id: "swyc_posi",
  title: { en: "Parent's Observations of Social Interactions (POSI)", es: "Observaciones de Padres de Interacciones Sociales (POSI)" },
  audience: "caregiver",
  tier: 3,
  items: POSI_ITEMS,
  score: (responses) => {
    const totalScore = POSI_ITEMS.reduce((sum, item, index) => sum + rowScore(item, responses[index] ?? 0), 0);
    return { totalScore, band: totalScore >= 3 ? "discuss" : "lower_risk" };
  },
  bands: ["lower_risk", "discuss"],
  bandSummaries: {
    lower_risk: {
      en: "This score is below the POSI follow-up cutoff. It is a check-in, not a diagnosis.",
      es: "Este puntaje está por debajo del límite de seguimiento de POSI. Es un chequeo, no un diagnóstico."
    },
    discuss: {
      en: "This score meets the POSI follow-up cutoff and is worth discussing with your child's clinician. It is not a diagnosis.",
      es: "Este puntaje alcanza el límite de seguimiento de POSI y conviene hablarlo con el profesional de salud de tu hijo o hija. No es un diagnóstico."
    }
  },
  consent: {
    en: {
      title: "Before the social-interaction preview",
      points: ["This optional caregiver check does not diagnose autism or another condition."],
      acknowledge: "I understand — start"
    },
    es: {
      title: "Antes de la vista previa sobre interacciones sociales",
      points: ["Este chequeo opcional para cuidadores no diagnostica autismo ni otra condición."],
      acknowledge: "Entiendo — comenzar"
    }
  },
  wordingVerified: false,
  licenseStatus: "pending",
  attribution: {
    en: "© Tufts Medical Center / TEAM UP Center; used unmodified",
    es: "© Tufts Medical Center / TEAM UP Center; usado sin modificaciones"
  }
};
