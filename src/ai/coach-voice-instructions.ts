import type { AppState } from "@/domain/types";
import { buildCoachSystemPrompt } from "./coach-provider";

export function buildCoachVoiceInstructions(state: AppState): string {
  return [
    buildCoachSystemPrompt(state),
    "This is a spoken conversation. Keep each spoken reply to about three short sentences unless the patient asks for more. Use natural pauses and no markdown. If interrupted, stop and listen."
  ].join("\n\n");
}
