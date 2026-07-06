import { createHash } from "node:crypto";

// Builds a stable, non-reversible per-patient identifier for the OpenAI
// `OpenAI-Safety-Identifier` header on the realtime mint request. The token
// route runs on the Node runtime, so node:crypto is available. The patient id
// never leaves the device in the clear — only this salted sha256 digest.
export function buildVoiceSafetyIdentifier(patientId: string, salt = "patient-centered-voice-safety"): string {
  const digest = createHash("sha256").update(`${salt}:${patientId}`).digest("hex").slice(0, 32);
  return `pc_voice_${digest}`;
}
