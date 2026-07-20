"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PHQ9_CONSENT, PHQ9_ITEMS, PHQ9_RESPONSE_OPTIONS } from "@/domain/assessment";
import type { Language } from "@/i18n/strings";
import { ReadAloud } from "@/voice/read-aloud";
import { isSpeaking, speak, stopSpeaking, subscribeSpeaking } from "@/voice/tts";
import { useDictation } from "@/voice/use-dictation";
import { VoiceConsentSheet } from "@/voice/voice-consent-sheet";
import { useVoiceEntry, type VoiceEntryContext } from "@/voice/voice-consent";
import { VoiceIndicator } from "@/voice/voice-indicator";

const FIELD_NAMES = [
  "item0",
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6",
  "item7",
  "item8"
] as const;

const responseField = z.preprocess(
  (value) => (value === undefined || value === null || value === "" ? undefined : Number(value)),
  z.number().int().min(0).max(3)
);
const schema = z.object({
  item0: responseField,
  item1: responseField,
  item2: responseField,
  item3: responseField,
  item4: responseField,
  item5: responseField,
  item6: responseField,
  item7: responseField,
  item8: responseField
});
type FormValues = z.infer<typeof schema>;
type FieldName = (typeof FIELD_NAMES)[number];

const localVoiceLine: Record<Language, string> = {
  en: "Spoken answers are interpreted on this device and are not sent anywhere.",
  es: "Las respuestas habladas se interpretan en este dispositivo y no se envían a ningún lugar."
};

const voiceReprompt: Record<Language, string> = {
  en: "Please say one of the four answers shown, or tap an answer.",
  es: "Di una de las cuatro respuestas que aparecen, o toca una respuesta."
};

const valueAliases: Record<Language, Record<number, string[]>> = {
  en: {
    0: ["zero", "first", "the first one"],
    1: ["one", "second", "the second one"],
    2: ["two", "third", "the third one"],
    3: ["three", "fourth", "the fourth one"]
  },
  es: {
    0: ["cero", "primero", "primera", "el primero", "la primera"],
    1: ["uno", "una", "segundo", "segunda", "el segundo", "la segunda"],
    2: ["dos", "tercero", "tercera", "el tercero", "la tercera"],
    3: ["tres", "cuarto", "cuarta", "el cuarto", "la cuarta"]
  }
};

function normalizeVoiceAnswer(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchPhq9VoiceResponse(text: string, language: Language): number | null {
  const normalized = normalizeVoiceAnswer(text);
  if (/^[0-3]$/.test(normalized)) return Number(normalized);
  for (const option of PHQ9_RESPONSE_OPTIONS) {
    const label = normalizeVoiceAnswer(language === "es" ? option.es : option.en);
    if (normalized === label || valueAliases[language][option.value].some((alias) => normalized === normalizeVoiceAnswer(alias))) {
      return option.value;
    }
  }
  return null;
}

function Phq9VoiceControl({
  index,
  language,
  question,
  onMatch,
  voiceEntryContext
}: {
  index: number;
  language: Language;
  question: string;
  onMatch: (value: number) => void;
  voiceEntryContext?: VoiceEntryContext;
}) {
  const [showConsent, setShowConsent] = useState(false);
  const [tapOnly, setTapOnly] = useState(false);
  const [speaking, setSpeaking] = useState(() => isSpeaking());
  const failures = useRef(0);
  const { consentRequired, grantConsent, onSessionStart } = useVoiceEntry(voiceEntryContext);
  const answerLabels = PHQ9_RESPONSE_OPTIONS.map((option) => language === "es" ? option.es : option.en);

  useEffect(() => subscribeSpeaking(setSpeaking), []);

  const handleTranscript = useCallback((text: string): void => {
    const value = matchPhq9VoiceResponse(text, language);
    if (value !== null) {
      failures.current = 0;
      onMatch(value);
      return;
    }
    if (failures.current === 0) {
      void speak(voiceReprompt[language], { language });
    } else {
      setTapOnly(true);
    }
    failures.current += 1;
  }, [language, onMatch]);

  const dictation = useDictation({ language, onFinalTranscript: handleTranscript });

  function start(): void {
    stopSpeaking();
    if (consentRequired) {
      setShowConsent(true);
      return;
    }
    onSessionStart(`PHQ-9 item ${index + 1}`);
    dictation.start();
  }

  function acceptConsent(): void {
    grantConsent();
    setShowConsent(false);
    onSessionStart(`PHQ-9 item ${index + 1}`);
    dictation.start();
  }

  return (
    <div className="mt-2 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ReadAloud text={`${question}. ${answerLabels.join(". ")}`} language={language} />
        <button
          type="button"
          disabled={!dictation.supported || tapOnly}
          onClick={start}
          className="min-h-12 rounded-control border border-care px-3 py-2 text-sm font-semibold text-care disabled:opacity-50"
        >
          {language === "es" ? `Responder pregunta ${index + 1} por voz` : `Answer item ${index + 1} by voice`}
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
      {tapOnly ? (
        <p className="text-sm text-ink/65">
          {language === "es" ? "Elige una respuesta tocándola." : "Choose an answer by tapping it."}
        </p>
      ) : null}
      {showConsent ? <VoiceConsentSheet language={language} onAccept={acceptConsent} onCancel={() => setShowConsent(false)} /> : null}
    </div>
  );
}

export function Phq9CheckIn({
  language,
  onComplete,
  voiceEntryContext
}: {
  language: Language;
  onComplete: (itemResponses: number[]) => void;
  voiceEntryContext?: VoiceEntryContext;
}) {
  const [consented, setConsented] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!consented) {
    const consent = PHQ9_CONSENT[language];
    return (
      <section className="rounded-control border border-care/20 bg-calm p-5">
        <h2 className="text-xl font-semibold">{consent.title}</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6">
          {consent.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
          <li>{localVoiceLine[language]}</li>
        </ul>
        <button
          className="mt-4 inline-flex min-h-12 items-center rounded-control bg-care px-4 py-2 text-sm font-semibold text-white"
          onClick={() => setConsented(true)}
          type="button"
        >
          {consent.acknowledge}
        </button>
      </section>
    );
  }

  const submit = handleSubmit((values) => {
    onComplete(FIELD_NAMES.map((name) => values[name]));
  });

  const prompt =
    language === "es"
      ? "En las últimas dos semanas, ¿con qué frecuencia te han molestado los siguientes problemas?"
      : "Over the last two weeks, how often have you been bothered by any of the following?";

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <p className="text-sm leading-6 text-ink/75">{prompt}</p>
      {PHQ9_ITEMS.map((item, index) => (
        <fieldset key={item.id} className="grid gap-2 rounded-control border border-ink/10 bg-white p-4">
          <legend className="text-sm font-medium">{language === "es" ? item.es : item.en}</legend>
          <div className="grid gap-1">
            {PHQ9_RESPONSE_OPTIONS.map((option) => (
              <label key={option.value} className="flex min-h-12 items-center gap-2 text-sm">
                <input type="radio" value={option.value} {...register(FIELD_NAMES[index])} />
                {language === "es" ? option.es : option.en}
              </label>
            ))}
          </div>
          <Phq9VoiceControl
            index={index}
            language={language}
            question={language === "es" ? item.es : item.en}
            voiceEntryContext={voiceEntryContext}
            onMatch={(value) => setValue(FIELD_NAMES[index] as FieldName, String(value) as unknown as number, {
              shouldDirty: true,
              shouldValidate: true
            })}
          />
        </fieldset>
      ))}
      {Object.keys(errors).length > 0 ? (
        <p className="text-sm font-medium text-rose-700">
          {language === "es" ? "Por favor responde todas las preguntas." : "Please answer every question."}
        </p>
      ) : null}
      <button
        className="inline-flex min-h-12 items-center rounded-control bg-care px-4 py-2 font-semibold text-white"
        type="submit"
      >
        {language === "es" ? "Enviar" : "Submit"}
      </button>
    </form>
  );
}
