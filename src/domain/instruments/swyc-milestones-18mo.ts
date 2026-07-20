// TRANSCRIPTION REQUIRED: verify items verbatim against the official PDF before demo
import type { ScreeningInstrument } from "./types";

const CUTOFFS: Readonly<Record<number, number>> = { 18: 8, 19: 10, 20: 11, 21: 13, 22: 14 };

export const SWYC_18MO_INSTRUMENT: ScreeningInstrument = {
  id: "swyc_18mo",
  title: {
    en: "18-month development and social check",
    es: "Chequeo de desarrollo y comunicación de 18 meses"
  },
  instructions: {
    en: "Choose the answer that best describes what your child can do now.",
    es: "Elige la respuesta que mejor describa lo que tu hijo o hija puede hacer ahora."
  },
  audience: "caregiver",
  tier: 3,
  items: [
    { id: "runs", kind: "choice", en: "Runs", es: "Corre" },
    { id: "walks_up_stairs", kind: "choice", en: "Walks up stairs with help", es: "Sube escaleras caminando con ayuda" },
    { id: "kicks_ball", kind: "choice", en: "Kicks a ball", es: "Patea la pelota" },
    { id: "names_objects", kind: "choice", en: "Names at least 5 familiar objects - like ball or milk", es: "Nombra por lo menos 5 objetos familiares – por ejemplo pelota o leche" },
    { id: "names_body_parts", kind: "choice", en: "Names at least 5 body parts - like nose, hand, or tummy", es: "Nombra por lo menos 5 partes del cuerpo – por ejemplo nariz, mano, o boca" },
    { id: "climbs_ladder", kind: "choice", en: "Climbs up a ladder at a playground", es: "Sube escaleras en el parque de juegos" },
    { id: "uses_pronouns", kind: "choice", en: "Uses words like \"me\" or \"mine\"", es: "Usa palabras como “yo” o “mío”" },
    { id: "jumps", kind: "choice", en: "Jumps off the ground with two feet", es: "Salta en el suelo con los dos pies" },
    { id: "combines_words", kind: "choice", en: "Puts 2 or more words together - like \"more water\" or \"go outside\"", es: "Junta 2 o más palabras – como “más agua” o “quiero leche\"" },
    { id: "asks_for_help", kind: "choice", en: "Uses words to ask for help", es: "Usa palabras para pedir ayuda" }
  ],
  defaultOptions: [
    { value: 0, en: "Not Yet", es: "Todavía No" },
    { value: 1, en: "Somewhat", es: "Algunas Veces" },
    { value: 2, en: "Very Much", es: "Mucho" }
  ],
  score: (responses, context) => {
    const age = context?.childAgeMonths;
    if (age === undefined || !Number.isInteger(age) || CUTOFFS[age] === undefined) {
      throw new RangeError("SWYC 18-month scoring requires an age from 18 through 22 completed months.");
    }
    const totalScore = Array.from({ length: 10 }, (_, index) => responses[index] ?? 0).reduce(
      (sum, value) => sum + value,
      0
    );
    return { totalScore, band: totalScore <= CUTOFFS[age] ? "discuss" : "meets_expectations" };
  },
  bands: ["discuss", "meets_expectations"],
  bandSummaries: {
    discuss: {
      en: "This score is below the age-specific cutoff and is worth discussing with your child's clinician. It is a check-in, not a diagnosis.",
      es: "Este puntaje está por debajo del límite específico para la edad y conviene hablarlo con el profesional de salud de tu hijo o hija. Es un chequeo, no un diagnóstico."
    },
    meets_expectations: {
      en: "This score meets the age-specific expectations on this check-in. It is not a diagnosis.",
      es: "Este puntaje cumple las expectativas específicas para la edad en este chequeo. No es un diagnóstico."
    }
  },
  consent: {
    en: {
      title: "Before this 18-month preview",
      points: [
        "This demo asks about your child's current milestones and does not diagnose a developmental condition.",
        "Adjusted-age scoring for children born early is not supported in this demo."
      ],
      acknowledge: "I understand — start"
    },
    es: {
      title: "Antes de esta vista previa de 18 meses",
      points: [
        "Esta demostración pregunta sobre los logros actuales de tu hijo o hija y no diagnostica una condición del desarrollo.",
        "Esta demostración no permite ajustar la edad de niños nacidos antes de tiempo."
      ],
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
