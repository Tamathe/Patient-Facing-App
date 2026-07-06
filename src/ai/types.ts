import type { AiMessageAction, AiMode, AppState, IdentifiedFood, SafetyLevel } from "@/domain/types";
import type { RealtimeVoiceMetricsReport } from "./realtime-voice-metrics";

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
  grounding?: { allowed: boolean; blockedReasons: string[] };
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
  | {
      type: "safetyIntercept";
      safety: "crisis" | "escalate" | "blocked";
      content: string;
      banner?: string;
      actions: AiMessageAction[];
    }
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
  getMetricsReport?(): RealtimeVoiceMetricsReport;
};

export type HealthAiProvider = {
  respond(request: HealthAiRequest): Promise<HealthAiResponse>;
  openLiveSession?(init: LiveSessionInit): Promise<LiveSessionHandle>;
};
