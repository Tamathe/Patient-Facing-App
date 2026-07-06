"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PHQ9_CONSENT, PHQ9_ITEMS, PHQ9_RESPONSE_OPTIONS } from "@/domain/assessment";
import type { Language } from "@/i18n/strings";

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

export function Phq9CheckIn({
  language,
  onComplete
}: {
  language: Language;
  onComplete: (itemResponses: number[]) => void;
}) {
  const [consented, setConsented] = useState(false);
  const {
    register,
    handleSubmit,
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
