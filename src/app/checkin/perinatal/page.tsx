"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { InstrumentResult } from "@/components/instrument-result";
import { InstrumentRunner } from "@/components/instrument-runner";
import { getInstrument } from "@/domain/instruments/registry";
import type { ScreeningInstrument, ScreeningOutcome } from "@/domain/instruments/types";
import type { Language } from "@/i18n/strings";
import { useHealthState } from "@/state/store";

const COPY = {
  en: {
    title: "Check-in for you",
    framing: "Having a new baby is a lot. This 2-question check is for you, not just the baby.",
    continue: "Continue to the 9-question check",
    careTeam: "Talk with your OB or pediatrician — they expect this conversation."
  },
  es: {
    title: "Chequeo para ti",
    framing: "Tener un bebé nuevo es mucho. Este chequeo de 2 preguntas es para ti, no solo para el bebé.",
    continue: "Continuar con el chequeo de 9 preguntas",
    careTeam: "Habla con tu obstetra o pediatra — esperan esta conversación."
  }
} satisfies Record<Language, Record<"title" | "framing" | "continue" | "careTeam", string>>;

type PerinatalInstrumentId = "phq2" | "phq9";

type PendingResult = {
  instrument: ScreeningInstrument;
  responses: number[];
  outcome: ScreeningOutcome;
};

function isCrisisResult(result: PendingResult): boolean {
  return result.instrument.items.some(
    (item, index) => item.crisisOnPositive === true && (result.responses[index] ?? 0) > 0
  );
}

function PerinatalCheck({ language }: { language: Language }) {
  const [instrumentId, setInstrumentId] = useState<PerinatalInstrumentId>("phq2");
  const [pending, setPending] = useState<PendingResult | null>(null);
  const copy = COPY[language];
  const instrument = pending?.instrument ?? getInstrument(instrumentId);

  if (!instrument) {
    return null;
  }

  if (pending && isCrisisResult(pending)) {
    return <InstrumentResult instrument={pending.instrument} language={language} responses={pending.responses} />;
  }

  function continueToPhq9(): void {
    setInstrumentId("phq9");
    setPending(null);
  }

  return (
    <div className="grid gap-5">
      {instrumentId === "phq2" ? (
        <section className="rounded-control border border-care/20 bg-calm p-5">
          <p className="text-sm font-medium leading-6">{copy.framing}</p>
        </section>
      ) : null}
      {pending ? (
        <div className="grid gap-4">
          <InstrumentResult instrument={pending.instrument} language={language} responses={pending.responses} />
          {pending.instrument.id === "phq2" && pending.outcome.totalScore >= 3 ? (
            <button
              className="min-h-12 rounded-control bg-care px-4 py-2 font-semibold text-white"
              onClick={continueToPhq9}
              type="button"
            >
              {copy.continue}
            </button>
          ) : null}
          {pending.instrument.id === "phq9" && pending.outcome.totalScore >= 10 ? (
            <p className="rounded-control border border-care/20 bg-calm p-5 text-sm font-medium leading-6">
              {copy.careTeam}
            </p>
          ) : null}
        </div>
      ) : (
        <InstrumentRunner
          instrument={instrument}
          key={instrument.id}
          language={language}
          onComplete={(responses) =>
            setPending({ instrument, responses, outcome: instrument.score(responses) })
          }
        />
      )}
    </div>
  );
}

export default function PerinatalCheckPage() {
  const { state } = useHealthState();
  const language = state.patient.language;

  return (
    <AppShell title={COPY[language].title}>
      <PerinatalCheck language={language} />
    </AppShell>
  );
}
