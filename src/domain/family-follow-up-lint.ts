import { containsFamilyDiagnosisClaim } from "./family-diagnosis-lint";
import type { FamilyFollowUp } from "./family-interview";
import { FAMILY_RESOURCE_CATALOG } from "./family-resources";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const RESOURCE_NAME_PATTERN = new RegExp(
  [
    ...FAMILY_RESOURCE_CATALOG.map(({ name }) => escapeRegExp(name)),
    "\\b211\\b",
    "kynect",
    "KY-SPIN",
    "Michelle P\\.",
    "First Steps"
  ].join("|"),
  "i"
);

function containsUnsafeText(text: string, childFirstName?: string): boolean {
  return containsFamilyDiagnosisClaim(text, childFirstName) || RESOURCE_NAME_PATTERN.test(text);
}

export function sanitizeFamilyFollowUps(
  followUps: readonly FamilyFollowUp[],
  childFirstName?: string
): FamilyFollowUp[] {
  return followUps
    .filter(({ question, options }) => {
      const trimmedQuestion = question.trim();
      return (
        (trimmedQuestion.includes("?") || trimmedQuestion.includes("¿")) &&
        !containsUnsafeText(trimmedQuestion, childFirstName) &&
        options.every((option) => !containsUnsafeText(option.trim(), childFirstName))
      );
    })
    .slice(0, 3)
    .map(({ question, options }) => ({
      question: question.trim(),
      options: [...new Set(options.map((option) => option.trim()).filter(Boolean))].slice(0, 4)
    }));
}
