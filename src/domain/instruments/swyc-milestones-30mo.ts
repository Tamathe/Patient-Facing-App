// TRANSCRIPTION REQUIRED: verify items verbatim against the official PDF before demo
import type { ScreeningInstrument } from "./types";

const CUTOFFS: Readonly<Record<number, number>> = { 29: 9, 30: 10, 31: 11, 32: 12, 33: 13, 34: 13 };

export const SWYC_30MO_INSTRUMENT: ScreeningInstrument = {
  id: "swyc_30mo",
  title: {
    en: "30-month development and social check",
    es: "Chequeo de desarrollo y comunicación de 30 meses"
  },
  instructions: {
    en: "Choose the answer that best describes what your child can do now.",
    es: "Elige la respuesta que mejor describa lo que tu hijo o hija puede hacer ahora."
  },
  audience: "caregiver",
  tier: 3,
  items: [
    { id: "names_color", kind: "choice", en: "Names at least one color", es: "Nombra por lo menos un color" },
    { id: "look_at_me", kind: "choice", en: "Tries to get you to watch by saying \"Look at me\"", es: "Intenta hacer que usted lo mire diciendo “Mírame”" },
    { id: "says_first_name", kind: "choice", en: "Says his or her first name when asked", es: "Dice su primer nombre cuando se lo preguntan" },
    { id: "draws_lines", kind: "choice", en: "Draws lines", es: "Dibuja líneas" },
    { id: "understood", kind: "choice", en: "Talks so other people can understand him or her most of the time", es: "Cuando él o ella habla, los demás lo entienden la mayoría del tiempo" },
    { id: "washes_hands", kind: "choice", en: "Washes and dries hands without help (even if you turn on the water)", es: "Se lava y se seca las manos sin ayuda (incluso si usted abrae el agua)" },
    { id: "asks_why_how", kind: "choice", en: "Asks questions beginning with \"why\" or \"how\" - like \"Why no cookie?\"", es: "Hace preguntas que empiezan con “por qué” o “cómo” – por ejemplo “¿Por qué no galleta?" },
    { id: "explains_reasons", kind: "choice", en: "Explains the reasons for things, like needing a sweater when it's cold", es: "Explica el por qué de las cosas, por ejemplo necesitar un abrigo cuando hace frío" },
    { id: "compares_things", kind: "choice", en: "Compares things - using words like \"bigger\" or \"shorter\"", es: "Compara cosas usando palabras como “más grande” o “más corto\"" },
    { id: "answers_situations", kind: "choice", en: "Answers questions like \"What do you do when you are cold?\" or \"...when you are sleepy?\"", es: "Contesta preguntas como “¿Qué haces cuando tienes frío?” o “¿....cuando tienes sueño?" }
  ],
  defaultOptions: [
    { value: 0, en: "Not Yet", es: "Todavía No" },
    { value: 1, en: "Somewhat", es: "Algunas Veces" },
    { value: 2, en: "Very Much", es: "Mucho" }
  ],
  score: (responses, context) => {
    const age = context?.childAgeMonths;
    if (age === undefined || !Number.isInteger(age) || CUTOFFS[age] === undefined) {
      throw new RangeError("SWYC 30-month scoring requires an age from 29 through 34 completed months.");
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
      title: "Before this 30-month preview",
      points: ["This demo asks about your child's current milestones and does not diagnose a developmental condition."],
      acknowledge: "I understand — start"
    },
    es: {
      title: "Antes de esta vista previa de 30 meses",
      points: ["Esta demostración pregunta sobre los logros actuales de tu hijo o hija y no diagnostica una condición del desarrollo."],
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
