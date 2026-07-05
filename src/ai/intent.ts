import type { AiMode } from "@/domain/types";

// When the patient has not picked a specific mode chip (the default is "explain"),
// infer a better intent from what they actually typed so the answer is not generic.
export function inferAiMode(patientInput: string, currentMode: AiMode): AiMode {
  if (currentMode !== "explain") {
    return currentMode;
  }

  const input = patientInput.toLowerCase();

  if (/\bwhy\b|worth it|feel fine|even need|really need|do i (even |really )?need|what'?s the point/.test(input)) {
    return "why";
  }

  if (/\bvisit\b|appointment|see (the|my) (doctor|clinic|team|provider)|next (visit|appointment)|prepare/.test(input)) {
    return "visit";
  }

  if (/what (should|do|can) i ask|questions? (to|for|i should)|bring up/.test(input)) {
    return "ask";
  }

  if (/side effect|dizz|lightheaded|cough|cost|afford|forgot|ran out|skip|trouble|hard to/.test(input)) {
    return "trouble";
  }

  return "explain";
}
