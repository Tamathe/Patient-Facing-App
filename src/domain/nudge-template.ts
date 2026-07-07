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
    id: "screening_nudge_v1",
    requiredSlots: ["firstName", "months"],
    bodyByLanguage: {
      en: "Hi {{firstName}} — it's been {{months}} months since your last diabetes eye check. A new photo takes about 10 minutes, close to home.",
      es: "Hola {{firstName}} — han pasado {{months}} meses desde tu último chequeo de ojos por la diabetes. Una nueva foto toma unos 10 minutos, cerca de casa."
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
