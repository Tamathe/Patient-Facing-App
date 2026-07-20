"use client";

import Link from "next/link";
import React from "react";
import { AppShell } from "@/components/app-shell";
import { INSTRUMENTS, getInstrument } from "@/domain/instruments/registry";
import type { ScreeningInstrument } from "@/domain/instruments/types";
import type { AssessmentEvent } from "@/domain/assessment";
import type { Language } from "@/i18n/strings";
import { useHealthState } from "@/state/store";

const COPY = {
  en: {
    title: "Screening hub",
    due: "Due now",
    upToDate: "You're up to date.",
    start: "Start",
    quick: "Quick check",
    quickBody: "Five short screens with follow-up questions only when needed.",
    quickStart: "Start the 2-minute check",
    family: "Family support",
    familyBody: "Continue to family and caregiver support.",
    history: "History",
    emptyHistory: "No completed check-ins yet.",
    fallbackTitle: "Check-in"
  },
  es: {
    title: "Centro de chequeos",
    due: "Para hacer ahora",
    upToDate: "Estás al día.",
    start: "Comenzar",
    quick: "Chequeo rápido",
    quickBody: "Cinco chequeos breves con preguntas de seguimiento solo cuando sea necesario.",
    quickStart: "Comenzar el chequeo de 2 minutos",
    family: "Apoyo familiar",
    familyBody: "Continúa al apoyo para familias y personas cuidadoras.",
    history: "Historial",
    emptyHistory: "Aún no hay chequeos completados.",
    fallbackTitle: "Chequeo"
  }
} satisfies Record<Language, Record<string, string>>;

function latestEventFor(instrument: ScreeningInstrument, events: AssessmentEvent[]): AssessmentEvent | undefined {
  return events
    .filter(({ instrumentId }) => instrumentId === instrument.id)
    .sort((left, right) => new Date(right.recordedAt).valueOf() - new Date(left.recordedAt).valueOf())[0];
}

function isDue(instrument: ScreeningInstrument, events: AssessmentEvent[]): boolean {
  if (instrument.recurrenceDays === undefined) {
    return false;
  }
  const latest = latestEventFor(instrument, events);
  return (
    latest === undefined ||
    Date.now() - new Date(latest.recordedAt).valueOf() > instrument.recurrenceDays * 24 * 60 * 60 * 1000
  );
}

export default function CheckinPage() {
  const { state } = useHealthState();
  const language = state.patient.language;
  const copy = COPY[language];
  const instruments = Object.values(INSTRUMENTS);
  const due = instruments.filter((instrument) => isDue(instrument, state.assessmentEvents));
  const history = [...state.assessmentEvents].sort(
    (left, right) => new Date(right.recordedAt).valueOf() - new Date(left.recordedAt).valueOf()
  );

  return (
    <AppShell title={copy.title}>
      <div className="grid gap-5">
        <section className="rounded-control border border-care/20 bg-calm p-5">
          <h2 className="text-xl font-semibold">{copy.due}</h2>
          {due.length === 0 ? (
            <p className="mt-2 text-sm text-ink/70">{copy.upToDate}</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {due.map((instrument) => (
                <Link
                  className="flex min-h-12 items-center justify-between gap-3 rounded-control bg-care px-4 py-3 font-semibold text-white"
                  href={`/checkin/${instrument.id}`}
                  key={instrument.id}
                >
                  <span>{instrument.title[language]}</span>
                  <span>{copy.start}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-control border border-ink/10 bg-white p-5">
          <h2 className="text-xl font-semibold">{copy.quick}</h2>
          <p className="mt-2 text-sm text-ink/70">{copy.quickBody}</p>
          <Link className="mt-3 inline-flex min-h-12 items-center rounded-control bg-care px-4 py-2 font-semibold text-white" href="/checkin/quick">
            {copy.quickStart}
          </Link>
        </section>

        {state.family ? (
          <section className="rounded-control border border-ink/10 bg-white p-5">
            <Link className="text-lg font-semibold text-care underline" href="/family">
              {copy.family}
            </Link>
            <p className="mt-2 text-sm text-ink/70">{copy.familyBody}</p>
          </section>
        ) : null}

        <section aria-label={copy.history} className="rounded-control border border-ink/10 bg-white p-5">
          <h2 className="text-xl font-semibold">{copy.history}</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-ink/70">{copy.emptyHistory}</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {history.map((event) => {
                const instrument = getInstrument(event.instrumentId);
                return (
                  <li className="rounded-control border border-ink/10 p-3" key={event.id}>
                    <p className="font-medium">{instrument?.title[language] ?? copy.fallbackTitle}</p>
                    <time className="text-sm text-ink/60" dateTime={event.recordedAt}>
                      {new Date(event.recordedAt).toLocaleDateString(language === "es" ? "es-US" : "en-US", {
                        dateStyle: "medium"
                      })}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
