"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InstrumentResult } from "@/components/instrument-result";
import { InstrumentRunner } from "@/components/instrument-runner";
import { Phq9CheckIn } from "@/components/phq9-check-in";
import { FamilyScreeningResult } from "@/components/family-screening-result";
import { SwycCheckin } from "@/components/swyc-checkin";
import { childAgeMonths, familyScreeningEntries } from "@/domain/family-screenings";
import { getInstrument } from "@/domain/instruments/registry";
import type { AssessmentEvent } from "@/domain/assessment";
import { useHealthState } from "@/state/store";

export default function InstrumentPage() {
  const params = useParams<{ instrumentId: string | string[] }>();
  const { state, dispatch } = useHealthState();
  const [responses, setResponses] = useState<number[] | null>(null);
  const language = state.patient.language;
  const routeId = Array.isArray(params.instrumentId) ? params.instrumentId[0] : params.instrumentId;
  const instrument = getInstrument(routeId);
  const familyProfile = state.family?.profile ?? null;
  const now = new Date();
  const familyEntries = familyProfile ? familyScreeningEntries(familyProfile, now) : [];
  const familyEntry = familyEntries.find(({ routeId: familyRouteId }) => familyRouteId === routeId);
  const isFamilyOnlyRoute = routeId === "swyc_18mo" || routeId === "swyc_30mo" || routeId === "swyc_posi" || routeId === "psc17" || routeId === "phq_a";
  const familyRouteAvailable = !isFamilyOnlyRoute || (routeId !== "swyc_posi" && familyEntry !== undefined);
  const latestTobaccoEvent = state.assessmentEvents
    .filter(({ instrumentId }) => instrumentId === "tobacco_use")
    .sort((left, right) => new Date(right.recordedAt).valueOf() - new Date(left.recordedAt).valueOf())[0] as AssessmentEvent | undefined;
  const smokingStatus = latestTobaccoEvent?.severityBand === "current"
    ? 1
    : latestTobaccoEvent?.severityBand === "former"
      ? 0
      : undefined;
  const prefillLungStatus = instrument?.id === "lung_ldct_eligibility" && smokingStatus !== undefined;

  if (!instrument || !familyRouteAvailable) {
    return (
      <AppShell title={language === "es" ? "Chequeo no disponible" : "Check-in unavailable"}>
        <p className="rounded-control border border-ink/10 bg-white p-5 text-sm">
          {language === "es" ? "Este chequeo no está disponible." : "This check-in is not available."}
        </p>
      </AppShell>
    );
  }

  if ((routeId === "swyc_18mo" || routeId === "swyc_30mo") && familyProfile) {
    const age = childAgeMonths(familyProfile, now);
    if (age === null) {
      return null;
    }
    return (
      <AppShell title={instrument.title[language]}>
        <SwycCheckin
          childAgeMonths={age}
          language={language}
          milestoneInstrument={instrument}
          profile={familyProfile}
        />
      </AppShell>
    );
  }

  const familyActions =
    instrument.id === "psc17" && responses !== null && instrument.score(responses).band === "discuss"
      ? <FamilyScreeningResult kind="psc17" language={language} />
      : undefined;

  return (
    <AppShell title={instrument.title[language]}>
      {responses === null ? (
        instrument.id === "phq9" ? (
          <Phq9CheckIn
            language={language}
            onComplete={setResponses}
            voiceEntryContext={{ patientId: state.patient.id, dispatch }}
          />
        ) : (
          <InstrumentRunner
            childName={familyProfile?.childFirstName}
            hiddenItemIds={prefillLungStatus ? ["smoking_status"] : undefined}
            initialResponses={prefillLungStatus ? { smoking_status: smokingStatus } : undefined}
            instrument={instrument}
            language={language}
            onComplete={setResponses}
          />
        )
      ) : (
        <InstrumentResult actions={familyActions} instrument={instrument} language={language} responses={responses} />
      )}
    </AppShell>
  );
}
