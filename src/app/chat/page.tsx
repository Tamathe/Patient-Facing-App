"use client";

import { AppShell } from "@/components/app-shell";
import { ConversationPanel } from "@/components/conversation-panel";
import { OpenAiCoachProvider } from "@/ai/coach-provider";
import { createSafeAiResponse } from "@/ai/safety-gate";
import { buildCareTeamMessage } from "@/domain/care-team-message";
import { prefilledMessageForTask } from "@/domain/task-prefill";
import { recordAuditEvent } from "@/domain/audit";
import { useEffect, useMemo, useRef } from "react";
import type { AiMessage, AiMode } from "@/domain/types";
import { useHealthState } from "@/state/store";

export default function ChatPage() {
  const { state, dispatch } = useHealthState();
  const latestStateRef = useRef(state);
  const prefillHandled = useRef(false);
  // Live text coach when a key is configured (and the demo passcode from ?k= is
  // present); otherwise the provider degrades to the on-device mock. The answer
  // always flows back through createSafeAiResponse, so crisis + grounding hold.
  const provider = useMemo(() => {
    const passcode =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("k") ?? undefined : undefined;
    return new OpenAiCoachProvider({ passcode });
  }, []);

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

    const glucose = state.glucoseReadings.find((item) => item.id === id);
    if (glucose) {
      return `your blood sugar of ${glucose.valueMgDl} mg/dL`;
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

    if (response.grounding?.allowed === false) {
      dispatch({
        type: "addAuditEvent",
        event: recordAuditEvent(state.patient.id, "ai_generated", "AI answer replaced by grounding fallback")
      });
    }

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

  // A deep link from a task chip or notification (/chat?taskId=…) reconstructs
  // that task's prefilled turn and submits it exactly like typed input, so the
  // safety gate + grounding still run. The param is stripped so a refresh does
  // not replay it, and the ref guards against double submission.
  useEffect(() => {
    if (prefillHandled.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("taskId");
    const ask = params.get("ask");
    if (!taskId && !ask) {
      return;
    }
    prefillHandled.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    if (taskId) {
      const prefill = prefilledMessageForTask(taskId, latestStateRef.current);
      if (prefill) {
        void handleSubmit(prefill.mode, prefill.input);
      }
    } else if (ask) {
      void handleSubmit("explain", ask);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
