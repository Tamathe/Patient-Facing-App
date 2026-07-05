import { describe, expect, it } from "vitest";
import { reduceRealtimeEvent } from "./realtime-session";

describe("reduceRealtimeEvent", () => {
  it("moves from connecting to listening on session.updated", () => {
    const result = reduceRealtimeEvent("connecting", { type: "session.updated" });
    expect(result.status).toBe("listening");
    expect(result.emits).toContainEqual({ type: "status", status: "listening" });
  });

  it("injects context on speech start and stays listening", () => {
    const result = reduceRealtimeEvent("listening", { type: "input_audio_buffer.speech_started" });
    expect(result.status).toBe("listening");
    expect(result.actions).toContain("injectContext");
  });

  it("injects context on barge-in while speaking", () => {
    const result = reduceRealtimeEvent("speaking", { type: "input_audio_buffer.speech_started" });
    expect(result.status).toBe("listening");
    expect(result.actions).toContain("injectContext");
  });

  it("moves to thinking on speech stop", () => {
    const result = reduceRealtimeEvent("listening", { type: "input_audio_buffer.speech_stopped" });
    expect(result.status).toBe("thinking");
  });

  it("emits a final user transcript", () => {
    const result = reduceRealtimeEvent("thinking", {
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Can I eat this?"
    });
    expect(result.emits).toContainEqual({ type: "userTranscript", text: "Can I eat this?", final: true });
  });

  it("moves to speaking when audio output starts", () => {
    const result = reduceRealtimeEvent("thinking", { type: "output_audio_buffer.started" });
    expect(result.status).toBe("speaking");
  });

  it("emits partial then final assistant transcripts", () => {
    const partial = reduceRealtimeEvent("speaking", { type: "response.output_audio_transcript.delta", delta: "That soup" });
    expect(partial.emits).toContainEqual({ type: "assistantTranscript", text: "That soup", final: false });

    const done = reduceRealtimeEvent("speaking", { type: "response.output_audio_transcript.done", transcript: "That soup is salty." });
    expect(done.emits).toContainEqual({ type: "assistantTranscript", text: "That soup is salty.", final: true });
  });

  it("returns to listening when the response is done", () => {
    expect(reduceRealtimeEvent("speaking", { type: "response.done" }).status).toBe("listening");
    expect(reduceRealtimeEvent("speaking", { type: "output_audio_buffer.stopped" }).status).toBe("listening");
  });

  it("emits a non-fatal error", () => {
    const result = reduceRealtimeEvent("listening", { type: "error", error: { message: "rate limited" } });
    expect(result.emits).toContainEqual({ type: "error", message: "rate limited", fatal: false });
  });

  it("ignores unknown events", () => {
    const result = reduceRealtimeEvent("listening", { type: "something.else" });
    expect(result).toEqual({ status: "listening", emits: [], actions: [] });
  });
});
