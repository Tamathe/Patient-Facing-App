"use client";

import { Mic } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { bpReadingInputSchema, glucoseReadingInputSchema } from "@/domain/schemas";
import type { MeasurementContext } from "@/domain/types";
import type { Language } from "@/i18n/strings";
import { parseBpUtterance, parseGlucoseUtterance } from "./number-parse";
import { isSpeaking, speak, stopSpeaking, subscribeSpeaking } from "./tts";
import { useDictation } from "./use-dictation";
import { VoiceConsentSheet } from "./voice-consent-sheet";
import { useVoiceEntry, type VoiceEntryContext } from "./voice-consent";
import { VoiceIndicator } from "./voice-indicator";

export type BpVoiceCaptureValues = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  contexts: MeasurementContext[];
  note: string;
};

export type GlucoseVoiceCaptureValues = {
  valueMgDl: number;
  contexts: MeasurementContext[];
  note: string;
};

type Props = {
  language: Language;
  voiceEntryContext?: VoiceEntryContext;
} & (
  | { kind: "bp"; onSave: (values: BpVoiceCaptureValues) => void }
  | { kind: "glucose"; onSave: (values: GlucoseVoiceCaptureValues) => void }
);

type Stage =
  | ({ kind: "bp" } & BpVoiceCaptureValues)
  | ({ kind: "glucose" } & GlucoseVoiceCaptureValues);

type CaptureCopy = {
  title: string;
  intro: string;
  microphone: string;
  typedLabel: string;
  review: string;
  transcript: string;
  when: string;
  note: string;
  save: string;
  invalid: string;
  noContext: string;
  fallback: string;
};

const copy: Record<Language, CaptureCopy> = {
  en: {
    title: "Use voice to log a reading",
    intro: "Say the number and when you took it. Review everything before you save.",
    microphone: "Say a reading",
    typedLabel: "Type what you would say",
    review: "Review typed words",
    transcript: "Heard",
    when: "When was this?",
    note: "Note",
    save: "Save voice reading",
    invalid: "That reading doesn't look right. Tap a number to fix it.",
    noContext: "Choose when this reading was taken before saving.",
    fallback: "Voice could not find a number. You can use the regular form below."
  },
  es: {
    title: "Usa la voz para registrar una lectura",
    intro: "Di el número y cuándo lo tomaste. Revisa todo antes de guardar.",
    microphone: "Decir una lectura",
    typedLabel: "Escribe lo que dirías",
    review: "Revisar palabras escritas",
    transcript: "Escuché",
    when: "¿Cuándo fue?",
    note: "Nota",
    save: "Guardar lectura de voz",
    invalid: "Esa lectura no parece correcta. Toca un número para corregirlo.",
    noContext: "Elige cuándo tomaste esta lectura antes de guardar.",
    fallback: "La voz no encontró un número. Puedes usar el formulario normal de abajo."
  }
};

const contexts: MeasurementContext[] = [
  "morning",
  "evening",
  "before_medicine",
  "after_medicine",
  "after_coffee",
  "after_resting",
  "during_symptoms"
];

const contextLabels: Record<Language, Record<MeasurementContext, string>> = {
  en: {
    morning: "Morning",
    evening: "Evening",
    before_medicine: "Before medicine",
    after_medicine: "After medicine",
    after_coffee: "After coffee",
    after_resting: "After resting",
    during_symptoms: "During symptoms"
  },
  es: {
    morning: "Mañana",
    evening: "Noche",
    before_medicine: "Antes del medicamento",
    after_medicine: "Después del medicamento",
    after_coffee: "Después del café",
    after_resting: "Después de descansar",
    during_symptoms: "Durante los síntomas"
  }
};

const digitWords: Record<Language, string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  es: ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]
};

function digits(value: number, language: Language): string {
  return String(value)
    .split("")
    .map((digit) => digitWords[language][Number(digit)])
    .join("-");
}

function invalidReadback(stage: Stage, language: Language): string {
  const heard = stage.kind === "bp"
    ? `${digits(stage.systolic, language)} ${language === "es" ? "sobre" : "over"} ${digits(stage.diastolic, language)}`
    : digits(stage.valueMgDl, language);
  return language === "es"
    ? `Escuché ${heard} — eso no parece correcto. Toca un número para corregirlo.`
    : `I heard ${heard} — that doesn't look right. Tap a number to fix it.`;
}

function numericStageIsValid(stage: Stage): boolean {
  if (stage.kind === "bp") {
    return bpReadingInputSchema.safeParse({ ...stage, contexts: stage.contexts.length > 0 ? stage.contexts : ["morning"] }).success;
  }
  return glucoseReadingInputSchema.safeParse({ ...stage, contexts: stage.contexts.length > 0 ? stage.contexts : ["morning"] }).success;
}

export function VoiceCaptureCard(props: Props) {
  const labels = copy[props.language];
  const [stage, setStage] = useState<Stage | null>(null);
  const [transcript, setTranscript] = useState("");
  const [typedTwin, setTypedTwin] = useState("");
  const [error, setError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [speaking, setSpeaking] = useState(() => isSpeaking());
  const parseFailures = useRef(0);
  const invalidFailures = useRef(0);
  const { consentRequired, grantConsent, onSessionStart } = useVoiceEntry(props.voiceEntryContext);

  useEffect(() => subscribeSpeaking(setSpeaking), []);

  const handleTranscript = useCallback((text: string): void => {
    setTranscript(text);
    const parsed = props.kind === "bp"
      ? parseBpUtterance(text, props.language)
      : parseGlucoseUtterance(text, props.language);
    if (!parsed) {
      setError(labels.fallback);
      if (parseFailures.current === 0) {
        const example = props.kind === "bp" ? "one twenty over eighty" : "one forty five";
        const prompt = props.language === "es"
          ? `Puedes decir un número, como ‘${props.kind === "bp" ? "ciento veinte sobre ochenta" : "ciento cuarenta y cinco"}’.`
          : `You can say a number, like ‘${example}’.`;
        void speak(prompt, { language: props.language });
      }
      parseFailures.current += 1;
      return;
    }

    parseFailures.current = 0;
    const next: Stage = props.kind === "bp"
      ? { kind: "bp", ...parsed, note: "" }
      : { kind: "glucose", ...parsed, note: "" };
    setStage(next);
    if (!numericStageIsValid(next)) {
      setError(labels.invalid);
      invalidFailures.current += 1;
      void speak(invalidReadback(next, props.language), { language: props.language });
    } else {
      invalidFailures.current = 0;
      setError("");
    }
  }, [labels.fallback, labels.invalid, props.kind, props.language]);

  const dictation = useDictation({ language: props.language, onFinalTranscript: handleTranscript });

  function startVoice(): void {
    stopSpeaking();
    if (consentRequired) {
      setShowConsent(true);
      return;
    }
    onSessionStart(props.kind === "bp" ? "blood pressure capture" : "blood sugar capture");
    dictation.start();
  }

  function acceptConsent(): void {
    grantConsent();
    setShowConsent(false);
    onSessionStart(props.kind === "bp" ? "blood pressure capture" : "blood sugar capture");
    dictation.start();
  }

  function toggleContext(context: MeasurementContext): void {
    setStage((current) => {
      if (!current) return current;
      const selected = current.contexts.includes(context)
        ? current.contexts.filter((value) => value !== context)
        : [...current.contexts, context];
      return { ...current, contexts: selected };
    });
  }

  function save(): void {
    if (!stage) return;
    if (stage.contexts.length === 0) {
      setError(labels.noContext);
      return;
    }
    if (stage.kind === "bp" && props.kind === "bp") {
      const parsed = bpReadingInputSchema.safeParse(stage);
      if (!parsed.success) {
        setError(labels.invalid);
        return;
      }
      props.onSave(parsed.data);
      void speak(
        props.language === "es"
          ? `Guardado: ${parsed.data.systolic} sobre ${parsed.data.diastolic}.`
          : `Saved: ${parsed.data.systolic} over ${parsed.data.diastolic}.`,
        { language: props.language }
      );
    } else if (stage.kind === "glucose" && props.kind === "glucose") {
      const parsed = glucoseReadingInputSchema.safeParse(stage);
      if (!parsed.success) {
        setError(labels.invalid);
        return;
      }
      props.onSave(parsed.data);
      void speak(
        props.language === "es" ? `Guardado: ${parsed.data.valueMgDl}.` : `Saved: ${parsed.data.valueMgDl}.`,
        { language: props.language }
      );
    }
    setStage(null);
    setTranscript("");
    setTypedTwin("");
    setError("");
  }

  return (
    <section className="rounded-control border border-care/25 bg-calm p-4">
      <h2 className="text-lg font-semibold">{labels.title}</h2>
      <p className="mt-1 text-sm leading-6 text-ink/75">{labels.intro}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startVoice}
          disabled={!dictation.supported || invalidFailures.current > 1}
          className="inline-flex min-h-12 items-center gap-2 rounded-control bg-care px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          <Mic aria-hidden="true" className="h-4 w-4" />
          {labels.microphone}
        </button>
        <VoiceIndicator
          listening={dictation.listening}
          speaking={speaking}
          onStop={() => {
            dictation.stop();
            stopSpeaking();
          }}
        />
      </div>
      {showConsent ? (
        <div className="mt-3">
          <VoiceConsentSheet language={props.language} onAccept={acceptConsent} onCancel={() => setShowConsent(false)} />
        </div>
      ) : null}
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleTranscript(typedTwin);
        }}
      >
        <label className="grid min-w-56 flex-1 gap-1 text-sm font-medium">
          {labels.typedLabel}
          <input
            value={typedTwin}
            onChange={(event) => setTypedTwin(event.target.value)}
            className="rounded-control border border-ink/20 bg-white px-3 py-2"
          />
        </label>
        <button type="submit" className="min-h-12 rounded-control border border-care px-3 py-2 font-semibold text-care">
          {labels.review}
        </button>
      </form>
      {transcript ? <p className="mt-3 text-sm"><strong>{labels.transcript}:</strong> {transcript}</p> : null}
      {stage ? (
        <div className="mt-4 grid gap-4 rounded-control border border-ink/10 bg-white p-4">
          {stage.kind === "bp" ? (
            <>
              <p className="text-3xl font-semibold">{stage.systolic} / {stage.diastolic}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm font-medium">
                  {props.language === "es" ? "Número superior" : "Top number"}
                  <input
                    aria-label="Top number"
                    type="number"
                    value={stage.systolic}
                    onChange={(event) => setStage({ ...stage, systolic: Number(event.target.value) })}
                    className="rounded-control border border-ink/20 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  {props.language === "es" ? "Número inferior" : "Bottom number"}
                  <input
                    aria-label="Bottom number"
                    type="number"
                    value={stage.diastolic}
                    onChange={(event) => setStage({ ...stage, diastolic: Number(event.target.value) })}
                    className="rounded-control border border-ink/20 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  {props.language === "es" ? "Pulso" : "Pulse"}
                  <input
                    type="number"
                    value={stage.pulse ?? ""}
                    onChange={(event) => setStage({ ...stage, pulse: event.target.value ? Number(event.target.value) : null })}
                    className="rounded-control border border-ink/20 px-3 py-2"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <p className="text-3xl font-semibold">{stage.valueMgDl} mg/dL</p>
              <label className="grid gap-1 text-sm font-medium">
                {props.language === "es" ? "Azúcar en sangre (mg/dL)" : "Blood sugar (mg/dL)"}
                <input
                  aria-label="Blood sugar (mg/dL)"
                  type="number"
                  value={stage.valueMgDl}
                  onChange={(event) => setStage({ ...stage, valueMgDl: Number(event.target.value) })}
                  className="rounded-control border border-ink/20 px-3 py-2"
                />
              </label>
            </>
          )}
          <fieldset>
            <legend className="text-sm font-medium">{labels.when}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {contexts.map((context) => (
                <label key={context} className="rounded-control border border-ink/15 px-3 py-2 text-sm">
                  <input
                    className="mr-2"
                    type="checkbox"
                    checked={stage.contexts.includes(context)}
                    onChange={() => toggleContext(context)}
                  />
                  {contextLabels[props.language][context]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm font-medium">
            {labels.note}
            <textarea
              value={stage.note}
              onChange={(event) => setStage({ ...stage, note: event.target.value })}
              className="min-h-20 rounded-control border border-ink/20 px-3 py-2"
            />
          </label>
          {error ? <p role="alert" className="text-sm font-medium text-pulse">{error}</p> : null}
          <button
            type="button"
            onClick={save}
            disabled={stage.contexts.length === 0}
            className="min-h-12 rounded-control bg-care px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {labels.save}
          </button>
        </div>
      ) : error ? <p role="alert" className="mt-3 text-sm font-medium text-pulse">{error}</p> : null}
    </section>
  );
}
