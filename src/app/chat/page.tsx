"use client";

import { AppShell } from "@/components/app-shell";
import { ConversationPanel } from "@/components/conversation-panel";
import { MockHealthAiProvider } from "@/ai/mock-provider";
import { createSafeAiResponse } from "@/ai/safety-gate";
import { useEffect, useRef } from "react";
import type { AiMessage, AiMode } from "@/domain/types";
import { useHealthState } from "@/state/store";

const provider = new MockHealthAiProvider();

export default function ChatPage() {
  const { state, dispatch } = useHealthState();
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  async function handleSubmit(mode: AiMode, patientInput: string) {
    const patientMessage: AiMessage = {
      id: crypto.randomUUID(),
      mode,
      role: "patient",
      content: patientInput,
      createdAt: new Date().toISOString(),
      safety: "allowed",
      sources: []
    };

    dispatch({
      type: "addAiMessage",
      message: patientMessage
    });

    const requestState = {
      ...latestStateRef.current,
      aiMessages: [...latestStateRef.current.aiMessages, patientMessage]
    };
    const response = await createSafeAiResponse({ mode, patientInput, state: requestState }, provider);

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
