"use client";

import React from "react";
import { useState } from "react";
import { glucoseReadingInputSchema } from "@/domain/schemas";
import type { MeasurementContext } from "@/domain/types";

type GlucoseLogFormValues = {
  valueMgDl: number;
  contexts: MeasurementContext[];
  note: string;
};

export function GlucoseLogForm({ onSubmit }: { onSubmit: (values: GlucoseLogFormValues) => void }) {
  const [error, setError] = useState("");

  function handleSubmit(formData: FormData) {
    const context = formData.get("context");
    const parsed = glucoseReadingInputSchema.safeParse({
      valueMgDl: formData.get("valueMgDl"),
      contexts: context ? [context] : [],
      note: formData.get("note") ?? ""
    });

    if (!parsed.success) {
      setError("Enter the number from your meter and select when this reading was taken.");
      return;
    }

    setError("");
    onSubmit(parsed.data);
  }

  return (
    <form action={handleSubmit} className="rounded-control border border-ink/10 bg-white p-4">
      <label className="grid gap-1 text-sm font-medium">
        Blood sugar (mg/dL)
        <input className="rounded-control border border-ink/20 px-3 py-2" inputMode="numeric" name="valueMgDl" />
      </label>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">When was this?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["morning", "Morning"],
            ["evening", "Evening"],
            ["before_medicine", "Before medicine"],
            ["after_medicine", "After medicine"],
            ["after_coffee", "After coffee"],
            ["after_resting", "After resting"],
            ["during_symptoms", "During symptoms"]
          ].map(([value, label]) => (
            <label key={value} className="rounded-control border border-ink/15 px-3 py-2 text-sm">
              <input className="mr-2" name="context" type="radio" value={value} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 grid gap-1 text-sm font-medium">
        Note
        <textarea className="min-h-20 rounded-control border border-ink/20 px-3 py-2" name="note" />
      </label>
      {error ? <p className="mt-3 text-sm font-medium text-pulse">{error}</p> : null}
      <button className="mt-4 rounded-control bg-care px-4 py-2 font-semibold text-white" type="submit">
        Save reading
      </button>
    </form>
  );
}
