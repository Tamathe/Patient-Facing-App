import type { Language } from "@/i18n/strings";

// Adapted from rhtp-prototype server/sms-disclosure.ts (concepts): outreach
// copy renders ONLY from an approved template, and every rendered message runs
// a prohibited-term lint before display. The rhtp lint guarded a real
// lock-screen SMS and prohibited even the word "diabetes"; this in-app landing
// renders after the patient opens their own app, so the lint here guards the
// categories that must never appear in outreach copy at all (behavioral
// health, SUD, reproductive health, HIV, interpersonal safety).
export type RenderNudgeInput = {
  templateId: string;
  language: Language;
  slots: Record<string, string>;
};

export type NudgeLintResult = { ok: true } | { ok: false; reason: "prohibited_term"; terms: string[] };

export type RenderNudgeResult =
  | { ok: true; message: string }
  | { ok: false; reason: "template_not_approved" | "missing_slot" | "disclosure_lint_failed"; message: string };

type ApprovedNudgeTemplate = {
  id: string;
  requiredSlots: string[];
  bodyByLanguage: Record<Language, string>;
};

const PROHIBITED_TERMS = [
  "suicide",
  "suicidio",
  "depression",
  "depresion",
  "depresión",
  "self-harm",
  "hiv",
  "vih",
  "substance",
  "sustancia",
  "opioid",
  "opioide",
  "methadone",
  "metadona",
  "pregnancy",
  "embarazo",
  "abortion",
  "aborto",
  "abuse",
  "abuso",
  "violence",
  "violencia"
];

const APPROVED_TEMPLATES: ApprovedNudgeTemplate[] = [
  {
    id: "development_check_nudge_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "A family development check-in is available in the app.",
      es: "Hay un chequeo familiar del desarrollo disponible en la aplicación."
    }
  },
  {
    id: "perinatal_check_nudge_v1",
    requiredSlots: ["firstName"],
    bodyByLanguage: {
      en: "Hi {{firstName}} — a quick check-in for you is ready in the app.",
      es: "Hola {{firstName}} — tienes un chequeo rápido para ti listo en la aplicación."
    }
  },
  {
    id: "screening_nudge_v1",
    requiredSlots: ["firstName", "months"],
    bodyByLanguage: {
      en: "Hi {{firstName}} — it's been {{months}} months since your last diabetes eye check. A new photo takes about 10 minutes, close to home.",
      es: "Hola {{firstName}} — han pasado {{months}} meses desde tu último chequeo de ojos por la diabetes. Una nueva foto toma unos 10 minutos, cerca de casa."
    }
  },
  {
    id: "family_stage_first_steps_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "First Steps does not accept new referrals in the final 45 days before age three. Contact the local point of entry to confirm whether the referral window remains open and ask about transition options if it does not.",
      es: "First Steps no acepta referidos nuevos durante los últimos 45 días antes de los tres años. Contacta el punto de entrada local para confirmar si la ventana sigue abierta y pregunta por opciones de transición si ya cerró."
    }
  },
  {
    id: "family_stage_age_three_transition_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "Ask for the transition conference and stay enrolled in First Steps so an eligible child can have an IEP in place by the third birthday.",
      es: "Pide la conferencia de transición y mantén la inscripción en First Steps para que un niño elegible pueda tener un IEP listo al cumplir tres años."
    }
  },
  {
    id: "family_stage_school_enrollment_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "Learn Kentucky's ARC and IEP process before preschool or kindergarten enrollment.",
      es: "Conoce el proceso ARC e IEP de Kentucky antes de la inscripción en preescolar o kindergarten."
    }
  },
  {
    id: "family_stage_waiver_apply_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "The Michelle P. waiting list is date ordered, so ask Kentucky how to apply now. Kentucky determines eligibility and waitlist placement.",
      es: "La lista de espera de Michelle P. se ordena por fecha, así que pregunta a Kentucky cómo solicitar ahora. Kentucky decide la elegibilidad y el lugar en la lista."
    }
  },
  {
    id: "family_stage_school_arc_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "Gather the family's concerns and ask the school how to request an ARC meeting or IEP evaluation.",
      es: "Reúne las preocupaciones de la familia y pregunta a la escuela cómo solicitar una reunión ARC o evaluación para un IEP."
    }
  },
  {
    id: "family_stage_parent_connection_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "A parent group or peer mentor can help the family learn next steps without navigating alone.",
      es: "Un grupo de padres o mentor puede ayudar a la familia a conocer los próximos pasos sin navegar sola."
    }
  },
  {
    id: "family_stage_sibling_respite_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "Look for honest local options for siblings and planned caregiving breaks.",
      es: "Busca opciones locales honestas para hermanos y descansos planificados del cuidado."
    }
  },
  {
    id: "family_stage_mission_transition_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "Use the school ARC process and Kentucky transition resources to begin planning for adult life.",
      es: "Usa el proceso ARC escolar y los recursos de transición de Kentucky para empezar a planificar la vida adulta."
    }
  },
  {
    id: "family_stage_before_eighteen_v1",
    requiredSlots: [],
    bodyByLanguage: {
      en: "Review SSI re-application, supported decision-making versus guardianship, and STABLE account options before age eighteen.",
      es: "Revisa la nueva solicitud de SSI, la toma de decisiones con apoyo frente a la tutela y las opciones de cuenta STABLE antes de los dieciocho años."
    }
  }
];

function approvedTemplate(templateId: string): ApprovedNudgeTemplate | undefined {
  return APPROVED_TEMPLATES.find((template) => template.id === templateId);
}

export function lintNudgeMessage(message: string): NudgeLintResult {
  const normalized = message.toLowerCase();
  const terms = [...new Set(PROHIBITED_TERMS)].filter((term) => normalized.includes(term));
  return terms.length === 0 ? { ok: true } : { ok: false, reason: "prohibited_term", terms };
}

export function renderNudge(input: RenderNudgeInput): RenderNudgeResult {
  const template = approvedTemplate(input.templateId);
  if (!template) {
    return { ok: false, reason: "template_not_approved", message: "Nudge template is not approved." };
  }

  if (template.requiredSlots.some((slot) => !input.slots[slot]?.trim())) {
    return { ok: false, reason: "missing_slot", message: "Nudge template is missing a required slot." };
  }

  const message = template.requiredSlots.reduce(
    (body, slot) => body.replaceAll(`{{${slot}}}`, input.slots[slot]),
    template.bodyByLanguage[input.language]
  );

  const lint = lintNudgeMessage(message);
  if (!lint.ok) {
    return {
      ok: false,
      reason: "disclosure_lint_failed",
      message: "Nudge copy contains prohibited health or safety disclosure text."
    };
  }

  return { ok: true, message };
}
