import type { AiMessageAction, AiMode, AppState, IdentifiedFood, SafetyLevel } from "@/domain/types";

export type HealthAiRequest = {
  mode: AiMode;
  patientInput: string;
  state: AppState;
  image?: string;
  identifiedFood?: IdentifiedFood;
};

export type HealthAiResponse = {
  content: string;
  safety: SafetyLevel;
  sources: string[];
  banner?: string;
  actions?: AiMessageAction[];
};

export type LiveSessionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "closed";

export type LiveSessionEvent =
  | { type: "status"; status: LiveSessionStatus }
  | { type: "userTranscript"; text: string; final: boolean }
  | { type: "assistantTranscript"; text: string; final: boolean }
  | { type: "error"; message: string; fatal: boolean };

export type LiveSessionContext = {
  frameDataUrl: string | null;
  identifiedFood: IdentifiedFood | null;
  flagTexts: string[];
};

export type LiveSessionInit = {
  language: "en" | "es";
  getState: () => AppState;
  getContext: () => LiveSessionContext;
  onEvent: (event: LiveSessionEvent) => void;
};

export type LiveSessionHandle = {
  sendUserText(text: string): void;
  updateInstructions(instructions: string): void;
  close(): void;
  getStatus(): LiveSessionStatus;
};

export type HealthAiProvider = {
  respond(request: HealthAiRequest): Promise<HealthAiResponse>;
  openLiveSession?(init: LiveSessionInit): Promise<LiveSessionHandle>;
};
