import { getFamilyResourceById, type FamilyResource } from "@/domain/family-resources";
import { HEARD_MAX, QUOTE_MAX, WHY_MAX, MAX_RECOMMENDATIONS } from "@/domain/family-rank";
import type { FamilyProfile } from "@/domain/types";
import type { Language } from "@/i18n/strings";

export type FamilyRankPromptInput = {
  text: string;
  profile: FamilyProfile;
  language: Language;
  candidateIds: readonly string[];
};

/** Catalog facts only — never caregiver text, never anything the model authored. */
function candidateLine(resource: FamilyResource): string {
  const ages = resource.ages
    ? `ages ${resource.ages.min ?? "any"}-${resource.ages.max ?? "any"}`
    : "all ages";
  const reach = resource.counties.includes("statewide") ? "statewide" : resource.counties.join("/");
  const urgency = resource.actNow ? ` ACT-NOW: ${resource.actNow}` : "";
  return `- ${resource.id} | ${resource.name} | ${reach} | ${ages} | ${resource.referralMode} | ${resource.summary}${urgency}`;
}

export function familyRankSystemPrompt(): string {
  return [
    "You help a Kentucky caregiver understand which of a fixed list of verified programs fits their situation, and why.",
    "You rank and explain. You never choose what exists: every recommendation must be one of the candidate ids given to you, copied exactly. Never invent an id, a program, or a phone number.",
    `Return JSON only with exactly: {"heard":"","lead":"","recommendations":[{"id":"","why":"","becauseYouSaid":"","urgency":""}]}.`,
    `"heard" (under ${HEARD_MAX} characters): one plain-language paragraph naming the lead concern in the caregiver's situation, addressed to them as "you". Describe what they told you. Never say or imply the child has a condition, and never name a diagnosis unless the caregiver explicitly reported one.`,
    '"lead": the single need domain that matters most, from the allowed domain list.',
    `"recommendations": most important first, at most ${MAX_RECOMMENDATIONS}. Order by what would help this family soonest, not by the order given.`,
    `"why" (under ${WHY_MAX} characters): why THIS program for THIS family, in plain language. Say what it does for them and what happens next. Do not name any other program.`,
    `"becauseYouSaid" (under ${QUOTE_MAX} characters, optional): a span copied EXACTLY from the caregiver's words, character for character. If you cannot copy one exactly, omit the field entirely. Never paraphrase into this field.`,
    '"urgency": "act_now" only when the candidate has an ACT-NOW note or a deadline genuinely applies; otherwise "soon" or "when_ready".',
    "Never diagnose, never estimate eligibility or approval odds, and never promise an outcome. Describe what a program is, who decides, and how to start.",
    "Write in the language of the request."
  ].join("\n");
}

export function familyRankUserPrompt({ text, profile, language, candidateIds }: FamilyRankPromptInput): string {
  const candidates = candidateIds
    .flatMap((id) => {
      const resource = getFamilyResourceById(id);
      return resource ? [candidateLine(resource)] : [];
    })
    .join("\n");

  const minimalProfile = {
    childFirstName: profile.childFirstName ?? null,
    birthYear: profile.birthYear || null,
    birthMonth: profile.birthMonth ?? null,
    schoolStage: profile.birthYear === 0 ? null : profile.schoolStage,
    county: profile.county || null,
    reportedDiagnoses: profile.diagnoses.map(({ label }) => label),
    language
  };

  return [
    `Profile: ${JSON.stringify(minimalProfile)}`,
    `Caregiver interview: ${JSON.stringify(text)}`,
    "Candidate programs (choose only from these ids):",
    candidates
  ].join("\n");
}
