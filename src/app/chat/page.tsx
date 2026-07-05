"use client";

import { AppShell } from "@/components/app-shell";
import { ConversationPanel } from "@/components/conversation-panel";
import { MockHealthAiProvider } from "@/ai/mock-provider";
import { createSafeAiResponse } from "@/ai/safety-gate";
import type { AiMode } from "@/domain/types";
import { useHealthState } from "@/state/store";

const provider = new MockHealthAiProvider();

export default function ChatPage() {
  const { state, dispatch } = useHealthState();

  async function handleSubmit(mode: AiMode, patientInput: string) {
    dispatch({
      type: "addAiMessage",
      message: {
        id: crypto.randomUUID(),
        mode,
        role: "patient",
        content: patientInput,
        createdAt: new Date().toISOString(),
        safety: "allowed",
        sources: []
      }
    });

    const response = await createSafeAiResponse({ mode, patientInput, state }, provider);

    dispatch({
      type: "addAiMessage",
      message: {
        id: crypto.randomUUID(),
        mode,
        role: "assistant",
        content: response.content,
        createdAt: new Date().toISOString(),
        safety: response.safety,
        sources: response.sources
      }
    });
  }

  return (
    <AppShell title="Coach">
      <ConversationPanel messages={state.aiMessages} onSubmit={handleSubmit} />
    </AppShell>
  );
}
