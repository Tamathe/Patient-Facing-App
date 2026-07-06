"use client";

import { AppShell } from "@/components/app-shell";
import { ConversationPanel } from "@/components/conversation-panel";
import { MockHealthAiProvider } from "@/ai/mock-provider";
import { createSafeAiResponse } from "@/ai/safety-gate";
import { buildCareTeamMessage } from "@/domain/care-team-message";
import { useRef } from "react";
import type { AiMessage, AiMode } from "@/domain/types";
import { useHealthState } from "@/state/store";

const provider = new MockHealthAiProvider();

export default function ChatPage() {
  const { state, dispatch } = useHealthState();
  const latestStateRef = useRef(state);

  function describeSource(id: string): string | null {
    if (id === state.carePlan.id) {
      return "your care plan";
    }

    const medication = state.medications.find((item) => item.id === id);
    if (medication) {
      return medication.name;
    }

    const reading = state.readings.find((item) => item.id === id);
    if (reading) {
      return `your reading of ${reading.systolic}/${reading.diastolic}`;
    }

    return null;
  }

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

    dispatch({ type: "addAiMessage", message: patientMessage });
    const stateAfterPatientMessage = {
      ...latestStateRef.current,
      aiMessages: [...latestStateRef.current.aiMessages, patientMessage]
    };
    latestStateRef.current = stateAfterPatientMessage;

    const response = await createSafeAiResponse({ mode, patientInput, state: stateAfterPatientMessage }, provider);
    const assistantMessage: AiMessage = {
      id: crypto.randomUUID(),
      mode,
      role: "assistant",
      content: response.content,
      createdAt: new Date().toISOString(),
      safety: response.safety,
      sources: response.sources,
      banner: response.banner,
      actions: response.actions
    };

    latestStateRef.current = {
      ...latestStateRef.current,
      aiMessages: [...latestStateRef.current.aiMessages, assistantMessage]
    };

    dispatch({ type: "addAiMessage", message: assistantMessage });
  }

  return (
    <AppShell title="Coach">
      <ConversationPanel
        messages={state.aiMessages}
        onSubmit={handleSubmit}
        clinic={{ name: state.patient.primaryClinicName, phone: state.patient.primaryClinicPhone }}
        careTeamDraft={buildCareTeamMessage(state)}
        describeSource={describeSource}
        language={state.patient.language}
        onAcknowledgeCrisis={(messageId) => dispatch({ type: "acknowledgeCrisis", messageId })}
      />
    </AppShell>
  );
}
