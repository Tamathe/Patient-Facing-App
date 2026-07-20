"use client";

import React, { useState } from "react";
import type { ScreeningInstrument } from "@/domain/instruments/types";
import { getInstrument } from "@/domain/instruments/registry";
import type { FamilyProfile } from "@/domain/types";
import type { Language } from "@/i18n/strings";
import { FamilyScreeningResult } from "./family-screening-result";
import { InstrumentResult } from "./instrument-result";
import { InstrumentRunner } from "./instrument-runner";

const COPY = {
  en: { continuePosi: "Continue to POSI", missing: "This preview is not available." },
  es: { continuePosi: "Continuar a POSI", missing: "Esta vista previa no está disponible." }
} satisfies Record<Language, Record<"continuePosi" | "missing", string>>;

export function SwycCheckin({
  milestoneInstrument,
  language,
  profile,
  childAgeMonths
}: {
  milestoneInstrument: ScreeningInstrument;
  language: Language;
  profile: FamilyProfile;
  childAgeMonths: number;
}) {
  const [milestoneResponses, setMilestoneResponses] = useState<number[] | null>(null);
  const [posiStarted, setPosiStarted] = useState(false);
  const [posiResponses, setPosiResponses] = useState<number[] | null>(null);
  const posiInstrument = getInstrument("swyc_posi");

  if (!posiInstrument) {
    return <p>{COPY[language].missing}</p>;
  }

  if (milestoneResponses === null) {
    return (
      <InstrumentRunner
        childName={profile.childFirstName}
        instrument={milestoneInstrument}
        language={language}
        onComplete={setMilestoneResponses}
      />
    );
  }

  if (!posiStarted) {
    return (
      <div className="grid gap-4">
        <InstrumentResult
          context={{ childAgeMonths }}
          instrument={milestoneInstrument}
          language={language}
          responses={milestoneResponses}
        />
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-control bg-care px-4 py-2 font-semibold text-white"
          onClick={() => setPosiStarted(true)}
          type="button"
        >
          {COPY[language].continuePosi}
        </button>
      </div>
    );
  }

  if (posiResponses === null) {
    return (
      <InstrumentRunner
        childName={profile.childFirstName}
        instrument={posiInstrument}
        language={language}
        onComplete={setPosiResponses}
      />
    );
  }

  const milestoneDiscuss = milestoneInstrument.score(milestoneResponses, { childAgeMonths }).band === "discuss";
  const posiDiscuss = posiInstrument.score(posiResponses).band === "discuss";
  const actions = milestoneDiscuss || posiDiscuss
    ? (
      <FamilyScreeningResult
        childAgeMonths={childAgeMonths}
        county={profile.county}
        kind="first_steps"
        language={language}
      />
    )
    : undefined;

  return (
    <InstrumentResult
      actions={actions}
      instrument={posiInstrument}
      language={language}
      responses={posiResponses}
    />
  );
}
