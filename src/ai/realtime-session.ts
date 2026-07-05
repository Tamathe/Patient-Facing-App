import type {
  LiveSessionContext,
  LiveSessionEvent,
  LiveSessionHandle,
  LiveSessionStatus
} from "./types";

export type RealtimeServerEvent = { type: string; [key: string]: unknown };

export type RealtimeReduction = {
  status: LiveSessionStatus;
  emits: LiveSessionEvent[];
  actions: Array<"injectContext">;
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function reduceRealtimeEvent(status: LiveSessionStatus, event: RealtimeServerEvent): RealtimeReduction {
  switch (event.type) {
    case "session.updated":
      if (status === "connecting") {
        return { status: "listening", emits: [{ type: "status", status: "listening" }], actions: [] };
      }
      return { status, emits: [], actions: [] };
    case "input_audio_buffer.speech_started":
      return { status: "listening", emits: [{ type: "status", status: "listening" }], actions: ["injectContext"] };
    case "input_audio_buffer.speech_stopped":
      return { status: "thinking", emits: [{ type: "status", status: "thinking" }], actions: [] };
    case "conversation.item.input_audio_transcription.completed":
      return {
        status,
        emits: [{ type: "userTranscript", text: str(event.transcript), final: true }],
        actions: []
      };
    case "response.created":
      return {
        status: "thinking",
        emits: status === "thinking" ? [] : [{ type: "status", status: "thinking" }],
        actions: []
      };
    case "output_audio_buffer.started":
      return { status: "speaking", emits: [{ type: "status", status: "speaking" }], actions: [] };
    case "response.output_audio_transcript.delta":
      return {
        status: "speaking",
        emits: [{ type: "assistantTranscript", text: str(event.delta), final: false }],
        actions: []
      };
    case "response.output_audio_transcript.done":
      return {
        status,
        emits: [{ type: "assistantTranscript", text: str(event.transcript), final: true }],
        actions: []
      };
    case "response.done":
    case "output_audio_buffer.stopped":
      return { status: "listening", emits: [{ type: "status", status: "listening" }], actions: [] };
    case "error": {
      const error = event.error;
      const message = error && typeof error === "object" && "message" in error ? str((error as { message: unknown }).message) : "Realtime error";
      return { status, emits: [{ type: "error", message, fatal: false }], actions: [] };
    }
    default:
      return { status, emits: [], actions: [] };
  }
}

export type ConnectArgs = {
  clientSecret: string;
  model: string;
  instructions: string;
  language: "en" | "es";
  getContext: () => LiveSessionContext;
  onEvent: (event: LiveSessionEvent) => void;
};

const CONNECT_TIMEOUT_MS = 10000;
const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export async function connectRealtimeSession(args: ConnectArgs): Promise<LiveSessionHandle> {
  let status: LiveSessionStatus = "connecting";
  let closed = false;
  let lastInjectedFoodId: string | null = null;

  args.onEvent({ type: "status", status: "connecting" });

  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const pc = new RTCPeerConnection();
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;

  const cleanup = () => {
    micStream.getTracks().forEach((track) => track.stop());
    try {
      pc.close();
    } catch {
      // ignore
    }
    audioEl.pause();
    audioEl.srcObject = null;
  };

  const fail = (message: string) => {
    if (closed) {
      return;
    }
    closed = true;
    status = "error";
    cleanup();
    args.onEvent({ type: "error", message, fatal: true });
  };

  pc.ontrack = (event) => {
    audioEl.srcObject = event.streams[0];
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      fail("The voice connection dropped.");
    }
  };

  micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));
  const channel = pc.createDataChannel("oai-events");

  const send = (payload: unknown) => {
    if (channel.readyState === "open") {
      channel.send(JSON.stringify(payload));
    }
  };

  const injectContext = () => {
    const context = args.getContext();
    const content: Array<Record<string, unknown>> = [];
    if (context.frameDataUrl) {
      content.push({ type: "input_image", image_url: context.frameDataUrl });
    }
    const includeFood = context.identifiedFood && context.identifiedFood.id !== lastInjectedFoodId;
    if (context.identifiedFood) {
      lastInjectedFoodId = context.identifiedFood.id;
    }
    const foodJson = includeFood ? JSON.stringify(context.identifiedFood) : '{"foodData":"unchanged"}';
    const flags = context.flagTexts.length > 0 ? context.flagTexts.join("; ") : "none";
    content.push({
      type: "input_text",
      text: `[camera context — not spoken by the patient] Food data: ${foodJson}. Precomputed flags: ${flags}.`
    });
    send({ type: "conversation.item.create", item: { type: "message", role: "user", content } });
  };

  channel.onmessage = (message) => {
    let event: RealtimeServerEvent;
    try {
      event = JSON.parse(message.data) as RealtimeServerEvent;
    } catch {
      return;
    }
    const reduction = reduceRealtimeEvent(status, event);
    status = reduction.status;
    reduction.emits.forEach(args.onEvent);
    if (reduction.actions.includes("injectContext")) {
      injectContext();
    }
  };

  channel.onopen = () => {
    send({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: args.instructions,
        audio: {
          input: {
            transcription: { model: "gpt-4o-mini-transcribe" },
            turn_detection: { type: "server_vad", create_response: true, interrupt_response: true }
          }
        }
      }
    });
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const response = await fetch(`${REALTIME_CALLS_URL}?model=${encodeURIComponent(args.model)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.clientSecret}`,
      "Content-Type": "application/sdp"
    },
    body: offer.sdp,
    signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS)
  }).catch(() => null);

  if (!response || !response.ok) {
    fail("Could not start the voice session.");
    throw new Error("realtime_connect_failed");
  }

  const answer = await response.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answer });

  return {
    sendUserText: (text: string) => {
      send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text }] } });
      send({ type: "response.create" });
    },
    updateInstructions: (instructions: string) => {
      send({ type: "session.update", session: { type: "realtime", instructions } });
    },
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      status = "closed";
      try {
        channel.close();
      } catch {
        // ignore
      }
      cleanup();
      args.onEvent({ type: "status", status: "closed" });
    },
    getStatus: () => status
  };
}
