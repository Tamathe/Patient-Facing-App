"use client";

import React, { useEffect, useRef } from "react";
import { CRISIS_ACTIONS } from "@/ai/safety-gate";
import type { ScreeningInstrument } from "@/domain/instruments/types";
import type { AiMessage } from "@/domain/types";
import { tSafety, type Language } from "@/i18n/strings";
import { useHealthState } from "@/state/store";
import { MessageActions } from "./message-actions";

export function InstrumentResult({
  instrument,
  language,
  responses
}: {
  instrument: ScreeningInstrument;
  language: Language;
  responses: number[];
}) {
  const { state, dispatch } = useHealthState();
  const recorded = useRef(false);
  const outcome = instrument.score(responses);
  const crisis = instrument.items.some(
    (item, index) => item.crisisOnPositive === true && (responses[index] ?? 0) > 0
  );

  useEffect(() => {
    if (recorded.current) {
      return;
    }
    recorded.current = true;
    const recordedAt = new Date().toISOString();
    dispatch({
      type: "addAssessmentEvent",
      event: {
        id: crypto.randomUUID(),
        patientId: state.patient.id,
        instrumentId: instrument.id,
        itemResponses: responses,
        totalScore: outcome.totalScore,
        severityBand: outcome.band,
        status: "patient_reported",
        recordedAt
      }
    });

    if (crisis) {
      const message: AiMessage = {
        id: crypto.randomUUID(),
        mode: "trouble",
        role: "assistant",
        content: tSafety(language, "crisisResponse"),
        createdAt: recordedAt,
        safety: "crisis",
        sources: [],
        actions: CRISIS_ACTIONS
      };
      dispatch({ type: "addAiMessage", message });
    }
  }, [crisis, dispatch, instrument.id, language, outcome.band, outcome.totalScore, responses, state.patient.id]);

  if (crisis) {
    return (
      <section className="grid gap-3 rounded-control border border-rose-400 bg-rose-100 p-5">
        <p className="text-sm leading-6 font-medium text-rose-900">{tSafety(language, "crisisResponse")}</p>
        <MessageActions actions={CRISIS_ACTIONS} language={language} />
      </section>
    );
  }

  return (
    <section className="rounded-control border border-ink/10 bg-white p-5">
      <h2 className="text-lg font-semibold">
        {language === "es" ? "Gracias por tu chequeo" : "Thanks for checking in"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink/80">{instrument.bandSummaries[outcome.band][language]}</p>
    </section>
  );
}
