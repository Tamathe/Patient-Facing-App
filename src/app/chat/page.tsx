"use client";

import { AppShell } from "@/components/app-shell";
import { ConversationPanel } from "@/components/conversation-panel";
import { AssistantMessageAutoReader } from "@/voice/assistant-message-auto-reader";
import { OpenAiCoachProvider } from "@/ai/coach-provider";
import { createSafeAiResponse } from "@/ai/safety-gate";
import { buildCareTeamMessage, latestPatientConcern } from "@/domain/care-team-message";
import { parseBarrierSupportQuery } from "@/domain/adherence-support";
import { prefilledMessageForTask } from "@/domain/task-prefill";
import { recordAuditEvent } from "@/domain/audit";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AiMessage, AiMode } from "@/domain/types";
import { useHealthState } from "@/state/store";
import { hasUnacknowledgedCrisis } from "@/state/selectors";
import { useChatVoiceSession } from "@/hooks/use-chat-voice-session";
import type { VoiceSafetyIntercept } from "@/hooks/use-food-voice-session";
import { useVoiceEntry } from "@/voice/voice-consent";
import { VoiceConsentSheet } from "@/voice/voice-consent-sheet";
import { VoiceIndicator } from "@/voice/voice-indicator";

function ChatPanel() {
  const { state, dispatch } = useHealthState();
  const searchParams = useSearchParams();
  const supportQuery = parseBarrierSupportQuery(searchParams);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const prefillHandled = useRef(false);
  const [showVoiceConsent, setShowVoiceConsent] = useState(false);
  const crisisLock = hasUnacknowledgedCrisis(state);
  const voiceEntry = useVoiceEntry();
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

    const screeningResult = state.screeningResults.find((item) => item.id === id);
    if (screeningResult) {
      return `your eye screening report from ${new Date(screeningResult.confirmedAt).toLocaleDateString()}`;
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

  const appendVoiceMessage = useCallback((role: "patient" | "assistant", content: string): void => {
    const message: AiMessage = {
      id: crypto.randomUUID(),
      mode: "ask",
      role,
      content,
      createdAt: new Date().toISOString(),
      safety: "allowed",
      sources: role === "assistant" ? [latestStateRef.current.carePlan.id] : []
    };
    latestStateRef.current = {
      ...latestStateRef.current,
      aiMessages: [...latestStateRef.current.aiMessages, message]
    };
    dispatch({ type: "addAiMessage", message });
  }, [dispatch]);

  const appendVoiceIntercept = useCallback((intercept: VoiceSafetyIntercept): void => {
    const message: AiMessage = {
      id: crypto.randomUUID(),
      mode: "ask",
      role: "assistant",
      content: intercept.content,
      createdAt: new Date().toISOString(),
      safety: intercept.safety,
      sources: [],
      banner: intercept.banner,
      actions: intercept.actions
    };
    latestStateRef.current = {
      ...latestStateRef.current,
      aiMessages: [...latestStateRef.current.aiMessages, message]
    };
    dispatch({ type: "addAiMessage", message });
  }, [dispatch]);

  const voice = useChatVoiceSession({
    language: state.patient.language,
    getState: () => latestStateRef.current,
    onFinalTranscript: appendVoiceMessage,
    onSafetyIntercept: appendVoiceIntercept
  });
  const startVoice = voice.start;
  const stopVoice = voice.stop;
  const auditVoiceStart = voiceEntry.onSessionStart;
  const liveVoiceActive = !["idle", "closed", "error"].includes(voice.status);

  const beginVoice = useCallback(async (): Promise<void> => {
    auditVoiceStart("chat");
    await startVoice();
  }, [auditVoiceStart, startVoice]);

  useEffect(() => {
    const teardown = (): void => stopVoice();
    const onHidden = (): void => {
      if (document.hidden) teardown();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", teardown);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", teardown);
    };
  }, [stopVoice]);

  useEffect(() => {
    if (crisisLock) stopVoice();
  }, [crisisLock, stopVoice]);

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
    <>
      <AssistantMessageAutoReader
        messages={state.aiMessages}
        language={state.patient.language}
        enabled={state.patient.accessibilityPreferences?.includes("read_aloud") ?? false}
        liveVoiceActive={liveVoiceActive}
      />
      <section className="mb-4 rounded-control border border-care/20 bg-calm p-4">
        <h2 className="text-lg font-semibold">
          {state.patient.language === "es" ? "Hablar con el orientador" : "Talk with the coach"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink/75">
          {state.patient.language === "es"
            ? "La voz en vivo es opcional. También puedes usar el cuadro de mensajes de abajo."
            : "Live voice is optional. You can always use the message box below."}
        </p>
        {!crisisLock ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {liveVoiceActive ? (
              <button
                type="button"
                onClick={stopVoice}
                className="min-h-12 rounded-control border border-care bg-white px-4 py-2 font-semibold text-care"
              >
                {state.patient.language === "es" ? "Detener orientador por voz" : "Stop voice coach"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (voiceEntry.consentRequired) setShowVoiceConsent(true);
                  else void beginVoice();
                }}
                className="min-h-12 rounded-control bg-care px-4 py-2 font-semibold text-white"
              >
                {state.patient.language === "es" ? "Iniciar orientador por voz" : "Start voice coach"}
              </button>
            )}
            <VoiceIndicator
              listening={voice.status === "listening"}
              speaking={voice.status === "speaking"}
              onStop={stopVoice}
            />
          </div>
        ) : null}
        {showVoiceConsent && !crisisLock ? (
          <div className="mt-3">
            <VoiceConsentSheet
              language={state.patient.language}
              onAccept={() => {
                voiceEntry.grantConsent();
                setShowVoiceConsent(false);
                void beginVoice();
              }}
              onCancel={() => setShowVoiceConsent(false)}
            />
          </div>
        ) : null}
        {voice.mode === "mock" ? (
          <p className="mt-3 text-sm text-ink/70">
            {state.patient.language === "es"
              ? "La voz en vivo no está disponible. Usa el cuadro de mensajes de abajo."
              : "Live voice is unavailable. Use the message box below."}
          </p>
        ) : null}
        {voice.partialAssistantText ? <p aria-live="polite" className="mt-3 text-sm">{voice.partialAssistantText}</p> : null}
        {voice.error ? <p role="alert" className="mt-3 text-sm font-medium text-pulse">{voice.error}</p> : null}
      </section>
      <ConversationPanel
        messages={state.aiMessages}
        onSubmit={handleSubmit}
        initialMode={supportQuery.mode}
        initialInput={supportQuery.concern}
        clinic={{ name: state.patient.primaryClinicName, phone: state.patient.primaryClinicPhone }}
        careTeamDraft={buildCareTeamMessage(state, latestPatientConcern(state))}
        describeSource={describeSource}
        language={state.patient.language}
        onAcknowledgeCrisis={(messageId) => dispatch({ type: "acknowledgeCrisis", messageId })}
      />
    </>
  );
}

export default function ChatPage() {
  return (
    <AppShell title="Coach">
      <Suspense fallback={<p className="text-sm text-ink/70">Preparing your Coach…</p>}>
        <ChatPanel />
      </Suspense>
    </AppShell>
  );
}
