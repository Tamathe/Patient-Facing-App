export interface RealtimeVoiceMetricsReport {
  voiceTurnSamples: number[];
  voiceTurnP95Ms: number | null;
  voiceTurnP99Ms: number | null;
  voiceTurnBudgetMet: boolean;
  toolGatewaySamples: number[];
  toolGatewayP95Ms: number | null;
  toolGatewayBudgetMet: boolean;
  liveAudioMeasured: boolean;
}

export interface RealtimeVoiceMetricsOptions {
  nowMs?: () => number;
}

const VOICE_TURN_P95_BUDGET_MS = 1200;
const TOOL_GATEWAY_P95_BUDGET_MS = 400;

function percentile(values: number[], percentileRank: number): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(3));
}

function eventType(data: string): string | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

    const candidate = parsed as Record<string, unknown>;
    return typeof candidate.type === "string" ? candidate.type : null;
  } catch {
    return null;
  }
}

export function createRealtimeVoiceMetricsRecorder(options: RealtimeVoiceMetricsOptions = {}) {
  const nowMs = options.nowMs ?? performance.now.bind(performance);
  const voiceTurnSamples: number[] = [];
  const toolGatewaySamples: number[] = [];
  let currentSpeechStartMs: number | null = null;

  return {
    observeServerEvent(data: string): void {
      const type = eventType(data);

      if (type === "input_audio_buffer.speech_started") {
        currentSpeechStartMs = nowMs();
        return;
      }

      if (currentSpeechStartMs !== null && (type === "response.output_audio.done" || type === "response.done")) {
        voiceTurnSamples.push(Number((nowMs() - currentSpeechStartMs).toFixed(3)));
        currentSpeechStartMs = null;
      }
    },

    startToolGatewaySample(): () => void {
      const startedAt = nowMs();
      let recorded = false;

      return () => {
        if (recorded) return;

        recorded = true;
        toolGatewaySamples.push(Number((nowMs() - startedAt).toFixed(3)));
      };
    },

    report(): RealtimeVoiceMetricsReport {
      const voiceTurnP95Ms = percentile(voiceTurnSamples, 95);
      const toolGatewayP95Ms = percentile(toolGatewaySamples, 95);

      return {
        voiceTurnSamples: [...voiceTurnSamples],
        voiceTurnP95Ms,
        voiceTurnP99Ms: percentile(voiceTurnSamples, 99),
        voiceTurnBudgetMet: voiceTurnP95Ms === null || voiceTurnP95Ms <= VOICE_TURN_P95_BUDGET_MS,
        toolGatewaySamples: [...toolGatewaySamples],
        toolGatewayP95Ms,
        toolGatewayBudgetMet: toolGatewayP95Ms === null || toolGatewayP95Ms <= TOOL_GATEWAY_P95_BUDGET_MS,
        liveAudioMeasured: voiceTurnSamples.length > 0
      };
    }
  };
}
