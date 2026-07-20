"use client";

import Link from "next/link";
import React, { useState } from "react";
import { nextBatteryStep, TIER0_BATTERY } from "@/domain/instruments/battery";
import { getInstrument } from "@/domain/instruments/registry";
import type { ScreeningInstrument } from "@/domain/instruments/types";
import { findKentuckyResources } from "@/domain/sdoh-resources";
import type { Language } from "@/i18n/strings";
import { useHealthState } from "@/state/store";
import { InstrumentResult } from "./instrument-result";
import { InstrumentRunner } from "./instrument-runner";

const COPY = {
  en: {
    progress: (current: number) => `Check ${current} of 5`,
    exit: "Exit anytime",
    continue: "Continue",
    complete: "Your check-in is complete. You saw each result before moving on.",
    allNegative: "Nothing you reported needs follow-up today. This is a check-in, not a diagnosis.",
    foodTitle: "Kentucky food resources",
    foodBody: "These Kentucky resources can help with food access.",
    insulinNote: "Food access can make low blood sugar more likely when you take insulin or certain diabetes medicines. Keep your fast-sugar treatment nearby and contact your care team if lows occur.",
    tobaccoTitle: "Quit Now Kentucky",
    tobaccoBody: "Free quit coaching is available at 1-800-QUIT-NOW.",
    lungLink: "4 quick questions",
    comingNext: "Coming next",
    nidaTitle: "Talk with your care team",
    nidaBody: "You can choose a private conversation with your care team about what you reported.",
    privacy: "Your answers stay on this device. You choose if and when to share them."
  },
  es: {
    progress: (current: number) => `Chequeo ${current} de 5`,
    exit: "Salir en cualquier momento",
    continue: "Continuar",
    complete: "Tu chequeo está completo. Viste cada resultado antes de continuar.",
    allNegative: "Nada de lo que informaste necesita seguimiento hoy. Este es un chequeo, no un diagnóstico.",
    foodTitle: "Recursos de alimentos de Kentucky",
    foodBody: "Estos recursos de Kentucky pueden ayudar con el acceso a alimentos.",
    insulinNote: "El acceso a alimentos puede aumentar el riesgo de azúcar baja cuando usas insulina o ciertos medicamentos para la diabetes. Mantén cerca tu tratamiento de azúcar rápida y comunícate con tu equipo si tienes niveles bajos.",
    tobaccoTitle: "Quit Now Kentucky",
    tobaccoBody: "Hay apoyo gratuito para dejar de fumar en el 1-800-QUIT-NOW.",
    lungLink: "4 preguntas rápidas",
    comingNext: "Próximamente",
    nidaTitle: "Habla con tu equipo de atención",
    nidaBody: "Puedes elegir una conversación privada con tu equipo de atención sobre lo que informaste.",
    privacy: "Tus respuestas permanecen en este dispositivo. Tú eliges si las compartes y cuándo."
  }
} satisfies Record<Language, Record<string, string | ((current: number) => string)>>;

type PendingResult = {
  instrument: ScreeningInstrument;
  responses: number[];
  band: string;
};

function coreProgress(instrumentId: string): number {
  if (instrumentId === "phq9") {
    return 1;
  }
  if (instrumentId === "gad7") {
    return 2;
  }
  const index = TIER0_BATTERY.indexOf(instrumentId as (typeof TIER0_BATTERY)[number]);
  return index >= 0 ? index + 1 : 1;
}

function isCrisisResult({ instrument, responses }: PendingResult): boolean {
  return instrument.items.some(
    (item, index) => item.crisisOnPositive === true && (responses[index] ?? 0) > 0
  );
}

function hasHypoglycemiaMedication(names: readonly string[]): boolean {
  return names.some((name) => /insulin|glipizide|glyburide|glimepiride/i.test(name));
}

function CompletionCards({ language, outcomes }: { language: Language; outcomes: Readonly<Record<string, string>> }) {
  const { state } = useHealthState();
  const copy = COPY[language];
  const foodPositive = outcomes.hunger_vital_sign === "positive";
  const tobaccoCurrent = outcomes.tobacco_use === "current";
  const nidaPositive = outcomes.nida_single === "positive";
  const foodResources = foodPositive
    ? findKentuckyResources({ county: state.patient.county ?? "", needType: "food" })
    : [];
  const showInsulinNote = hasHypoglycemiaMedication(state.medications.map(({ name }) => name));
  const lungCheckAvailable = getInstrument("lung_ldct_eligibility") !== undefined;

  return (
    <div className="grid gap-4">
      {foodPositive ? (
        <section className="rounded-control border border-care/20 bg-calm p-5">
          <h2 className="text-lg font-semibold">{copy.foodTitle as string}</h2>
          <p className="mt-2 text-sm text-ink/70">{copy.foodBody as string}</p>
          <ul className="mt-3 grid gap-2">
            {foodResources.map((resource) => <li className="text-sm font-medium" key={resource.id}>{resource.name}</li>)}
          </ul>
          {showInsulinNote ? <p className="mt-3 text-sm font-medium text-rose-800">{copy.insulinNote as string}</p> : null}
        </section>
      ) : null}
      {tobaccoCurrent ? (
        <section className="rounded-control border border-care/20 bg-calm p-5">
          <h2 className="text-lg font-semibold">{copy.tobaccoTitle as string}</h2>
          <p className="mt-2 text-sm text-ink/70">{copy.tobaccoBody as string}</p>
          <a className="mt-3 inline-flex font-semibold text-care underline" href="tel:18007848669">1-800-QUIT-NOW</a>
          <div className="mt-3">
            {lungCheckAvailable ? (
              <Link className="font-semibold text-care underline" href="/checkin/lung_ldct_eligibility">{copy.lungLink as string}</Link>
            ) : (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span aria-disabled="true" className="font-semibold text-ink/50">{copy.lungLink as string}</span>
                <span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-semibold text-ink/60">{copy.comingNext as string}</span>
              </p>
            )}
          </div>
        </section>
      ) : null}
      {nidaPositive ? (
        <section className="rounded-control border border-care/20 bg-calm p-5">
          <h2 className="text-lg font-semibold">{copy.nidaTitle as string}</h2>
          <p className="mt-2 text-sm text-ink/70">{copy.nidaBody as string}</p>
          <p className="mt-3 text-sm font-medium">{copy.privacy as string}</p>
        </section>
      ) : null}
    </div>
  );
}

export function QuickCheck() {
  const { state } = useHealthState();
  const language = state.patient.language;
  const copy = COPY[language];
  const [completed, setCompleted] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingResult | null>(null);
  const step = nextBatteryStep(completed, outcomes);

  if (pending && isCrisisResult(pending)) {
    return <InstrumentResult instrument={pending.instrument} language={language} responses={pending.responses} />;
  }

  if (step === "done" && pending === null) {
    const allNegative = outcomes.phq2 === "negative" && outcomes.gad2 === "negative" &&
      outcomes.hunger_vital_sign === "negative" && outcomes.tobacco_use === "never" &&
      outcomes.nida_single === "negative";
    return (
      <div className="grid gap-5">
        <section className="rounded-control border border-care/20 bg-calm p-5">
          <p className="text-sm leading-6 font-medium">{allNegative ? copy.allNegative as string : copy.complete as string}</p>
        </section>
        <CompletionCards language={language} outcomes={outcomes} />
      </div>
    );
  }

  const instrument = pending?.instrument ?? getInstrument(step);
  if (!instrument) {
    return null;
  }

  function continueFlow(): void {
    if (!pending) {
      return;
    }
    setCompleted((current) => [...current, pending.instrument.id]);
    setOutcomes((current) => ({ ...current, [pending.instrument.id]: pending.band }));
    setPending(null);
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{(copy.progress as (current: number) => string)(coreProgress(instrument.id))}</p>
        <Link className="text-sm font-semibold text-care underline" href="/checkin">{copy.exit as string}</Link>
      </div>
      {pending ? (
        <div className="grid gap-4">
          <InstrumentResult instrument={pending.instrument} language={language} responses={pending.responses} />
          <button className="min-h-12 rounded-control bg-care px-4 py-2 font-semibold text-white" onClick={continueFlow} type="button">
            {copy.continue as string}
          </button>
        </div>
      ) : (
        <InstrumentRunner
          instrument={instrument}
          key={instrument.id}
          language={language}
          onComplete={(responses) => {
            const outcome = instrument.score(responses);
            setPending({ instrument, responses, band: outcome.band });
          }}
        />
      )}
    </div>
  );
}
