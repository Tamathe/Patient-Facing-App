"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MessageActions } from "@/components/message-actions";
import { Phq9CheckIn } from "@/components/phq9-check-in";
import { CRISIS_ACTIONS } from "@/ai/safety-gate";
import { phq9Item9IsPositive, scorePhq9, severityBandSummary } from "@/domain/assessment";
import { tSafety } from "@/i18n/strings";
import { useHealthState } from "@/state/store";
import type { AiMessage } from "@/domain/types";

type CheckinResult = { severitySummary: string; crisis: boolean };

export default function CheckinPage() {
  const { state, dispatch } = useHealthState();
  const language = state.patient.language;
  const [result, setResult] = useState<CheckinResult | null>(null);

  function handleComplete(itemResponses: number[]) {
    const { totalScore, severityBand } = scorePhq9(itemResponses);
    const crisis = phq9Item9IsPositive(itemResponses);

    dispatch({
      type: "addAssessmentEvent",
      event: {
        id: crypto.randomUUID(),
        patientId: state.patient.id,
        instrumentId: "phq9",
        itemResponses,
        totalScore,
        severityBand,
        status: "patient_reported",
        recordedAt: new Date().toISOString()
      }
    });

    // FR-4: any non-zero item-9 routes through the same crisis pathway as the
    // coach, independent of the total score. The assistant crisis message audits
    // as crisis_escalated via the store seam.
    if (crisis) {
      const message: AiMessage = {
        id: crypto.randomUUID(),
        mode: "trouble",
        role: "assistant",
        content: tSafety(language, "crisisResponse"),
        createdAt: new Date().toISOString(),
        safety: "crisis",
        sources: [],
        actions: CRISIS_ACTIONS
      };
      dispatch({ type: "addAiMessage", message });
    }

    setResult({ severitySummary: severityBandSummary(severityBand, language), crisis });
  }

  return (
    <AppShell title="Check-in">
      {result === null ? (
        <Phq9CheckIn language={language} onComplete={handleComplete} />
      ) : result.crisis ? (
        <section className="grid gap-3 rounded-control border border-rose-400 bg-rose-100 p-5">
          <p className="text-sm leading-6 font-medium text-rose-900">{tSafety(language, "crisisResponse")}</p>
          <MessageActions actions={CRISIS_ACTIONS} language={language} />
        </section>
      ) : (
        <section className="rounded-control border border-ink/10 bg-white p-5">
          <h2 className="text-lg font-semibold">{language === "es" ? "Gracias por tu chequeo" : "Thanks for checking in"}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/80">{result.severitySummary}</p>
        </section>
      )}
    </AppShell>
  );
}
