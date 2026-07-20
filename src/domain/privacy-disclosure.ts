export type AiDataMode = "checking" | "on_device" | "cloud_text" | "live_voice";

type VoiceTransportResult = {
  mode?: "live" | "mock" | "error" | "blocked";
  reason?: string;
};

export function aiDataModeForVoiceTransport(result: VoiceTransportResult): AiDataMode {
  if (result.mode === "live") {
    return "live_voice";
  }

  if (result.mode === "mock" && result.reason !== "fetch_failed") {
    return "on_device";
  }

  return "cloud_text";
}
