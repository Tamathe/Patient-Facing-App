import { describe, expect, it } from "vitest";
import { createRealtimeVoiceMetricsRecorder } from "./realtime-voice-metrics";

describe("createRealtimeVoiceMetricsRecorder", () => {
  it("measures speech-start to output-audio-done latency with p95 and p99", () => {
    let current = 100;
    const recorder = createRealtimeVoiceMetricsRecorder({ nowMs: () => current });

    recorder.observeServerEvent(JSON.stringify({ type: "input_audio_buffer.speech_started" }));
    current = 550;
    recorder.observeServerEvent(JSON.stringify({ type: "response.output_audio.done" }));
    current = 700;
    recorder.observeServerEvent(JSON.stringify({ type: "input_audio_buffer.speech_started" }));
    current = 1700;
    recorder.observeServerEvent(JSON.stringify({ type: "response.done" }));

    expect(recorder.report()).toEqual({
      voiceTurnSamples: [450, 1000],
      voiceTurnP95Ms: 1000,
      voiceTurnP99Ms: 1000,
      voiceTurnBudgetMet: true,
      toolGatewaySamples: [],
      toolGatewayP95Ms: null,
      toolGatewayBudgetMet: true,
      liveAudioMeasured: true
    });
  });

  it("measures tool gateway round trips against the P2 budget", () => {
    let current = 10;
    const recorder = createRealtimeVoiceMetricsRecorder({ nowMs: () => current });

    const finishFastTool = recorder.startToolGatewaySample();
    current = 250;
    finishFastTool();
    const finishSlowTool = recorder.startToolGatewaySample();
    current = 700;
    finishSlowTool();

    expect(recorder.report()).toEqual(
      expect.objectContaining({
        toolGatewaySamples: [240, 450],
        toolGatewayP95Ms: 450,
        toolGatewayBudgetMet: false
      })
    );
  });
});
