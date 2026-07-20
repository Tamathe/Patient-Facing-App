"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InstrumentResult } from "@/components/instrument-result";
import { InstrumentRunner } from "@/components/instrument-runner";
import { getInstrument } from "@/domain/instruments/registry";
import { useHealthState } from "@/state/store";

export default function InstrumentPage() {
  const params = useParams<{ instrumentId: string | string[] }>();
  const { state } = useHealthState();
  const [responses, setResponses] = useState<number[] | null>(null);
  const language = state.patient.language;
  const routeId = Array.isArray(params.instrumentId) ? params.instrumentId[0] : params.instrumentId;
  const instrument = getInstrument(routeId);

  if (!instrument) {
    return (
      <AppShell title={language === "es" ? "Chequeo no disponible" : "Check-in unavailable"}>
        <p className="rounded-control border border-ink/10 bg-white p-5 text-sm">
          {language === "es" ? "Este chequeo no está disponible." : "This check-in is not available."}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title={instrument.title[language]}>
      {responses === null ? (
        <InstrumentRunner instrument={instrument} language={language} onComplete={setResponses} />
      ) : (
        <InstrumentResult instrument={instrument} language={language} responses={responses} />
      )}
    </AppShell>
  );
}
