import { classifySafety } from "@/domain/safety";
import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";

export async function createSafeAiResponse(
  request: HealthAiRequest,
  provider: HealthAiProvider
): Promise<HealthAiResponse> {
  const safety = classifySafety(request.patientInput);

  if (safety.level !== "allowed") {
    return {
      content: safety.response,
      safety: safety.level,
      sources: []
    };
  }

  const response = await provider.respond(request);

  if (response.safety === "blocked" || response.safety === "escalate") {
    return response;
  }

  return {
    ...response,
    safety: "allowed"
  };
}
