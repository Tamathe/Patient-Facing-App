import type { AiMode, AppState } from "@/domain/types";

export type HealthAiRequest = {
  mode: AiMode;
  patientInput: string;
  state: AppState;
};

export type HealthAiResponse = {
  content: string;
  safety: "allowed" | "escalate" | "blocked";
  sources: string[];
};

export type HealthAiProvider = {
  respond(request: HealthAiRequest): Promise<HealthAiResponse>;
};
