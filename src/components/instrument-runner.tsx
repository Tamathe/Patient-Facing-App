"use client";

import React, { useState } from "react";
import type { ScreeningInstrument } from "@/domain/instruments/types";
import type { Language } from "@/i18n/strings";

const COPY = {
  en: {
    required: "Please answer every question.",
    submit: "Submit",
    draft: "Draft wording — verify against the official form before clinical use.",
    license: "Demo preview — not for clinical use until the electronic-use agreement is in place."
  },
  es: {
    required: "Por favor responde todas las preguntas.",
    submit: "Enviar",
    draft: "Borrador de redacción — verifica el formulario oficial antes del uso clínico.",
    license: "Vista previa de demostración — no usar clínicamente hasta que esté vigente el acuerdo de uso electrónico."
  }
} satisfies Record<Language, Record<"required" | "submit" | "draft" | "license", string>>;

export function InstrumentRunner({
  instrument,
  language,
  onComplete
}: {
  instrument: ScreeningInstrument;
  language: Language;
  onComplete: (responses: number[]) => void;
}) {
  const [consented, setConsented] = useState(false);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [showError, setShowError] = useState(false);

  if (!consented) {
    const consent = instrument.consent[language];
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

  function isVisible(itemIndex: number): boolean {
    const condition = instrument.items[itemIndex].conditionalOn;
    if (!condition) {
      return true;
    }
    return (responses[condition.itemId] ?? Number.NEGATIVE_INFINITY) >= condition.atLeast;
  }

  function responseIsValid(itemIndex: number): boolean {
    if (!isVisible(itemIndex)) {
      return instrument.items[itemIndex].notApplicableValue !== undefined;
    }
    const item = instrument.items[itemIndex];
    const value = responses[item.id];
    if (value === undefined || !Number.isFinite(value)) {
      return false;
    }
    if (item.kind === "choice") {
      const options = item.options ?? instrument.defaultOptions ?? [];
      return options.some((option) => option.value === value);
    }
    return (item.min === undefined || value >= item.min) && (item.max === undefined || value <= item.max);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instrument.items.every((_, index) => responseIsValid(index))) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onComplete(
      instrument.items.map((item, index) =>
        isVisible(index) ? responses[item.id] : (item.notApplicableValue as number)
      )
    );
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={submit}>
      <h2 className="text-xl font-semibold">{instrument.title[language]}</h2>
      {!instrument.wordingVerified ? (
        <p className="rounded-control border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {COPY[language].draft}
        </p>
      ) : null}
      {instrument.licenseStatus === "pending" ? (
        <p className="rounded-control border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {COPY[language].license}
        </p>
      ) : null}
      {instrument.items.map((item, index) => {
        if (!isVisible(index)) {
          return null;
        }
        if (item.kind === "number") {
          return (
            <div key={item.id} className="grid gap-2 rounded-control border border-ink/10 bg-white p-4">
              <label className="text-sm font-medium" htmlFor={`instrument-${instrument.id}-${item.id}`}>
                {item[language]}
              </label>
              <input
                className="min-h-12 rounded-control border border-ink/20 px-3"
                id={`instrument-${instrument.id}-${item.id}`}
                max={item.max}
                min={item.min}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setResponses((current) => {
                    if (value === "") {
                      const remaining = { ...current };
                      delete remaining[item.id];
                      return remaining;
                    }
                    return { ...current, [item.id]: Number(value) };
                  });
                }}
                type="number"
                value={responses[item.id] ?? ""}
              />
            </div>
          );
        }
        const options = item.options ?? instrument.defaultOptions ?? [];
        return (
          <fieldset key={item.id} className="grid gap-2 rounded-control border border-ink/10 bg-white p-4">
            <legend className="text-sm font-medium">{item[language]}</legend>
            <div className="grid gap-1">
              {options.map((option) => (
                <label key={option.value} className="flex min-h-12 items-center gap-2 text-sm">
                  <input
                    checked={responses[item.id] === option.value}
                    name={`${instrument.id}-${item.id}`}
                    onChange={() => setResponses((current) => ({ ...current, [item.id]: option.value }))}
                    type="radio"
                    value={option.value}
                  />
                  {option[language]}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      {showError ? (
        <p className="text-sm font-medium text-rose-700" role="alert">
          {COPY[language].required}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-ink/60">{instrument.attribution[language]}</p>
      <button
        className="inline-flex min-h-12 items-center rounded-control bg-care px-4 py-2 font-semibold text-white"
        type="submit"
      >
        {COPY[language].submit}
      </button>
    </form>
  );
}
