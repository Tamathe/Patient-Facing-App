"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { markOnboardingComplete } from "@/state/storage";
import { UrgentHelp } from "@/components/urgent-help";
import { useHealthState } from "@/state/store";
import type { Condition } from "@/domain/types";
import type { Language } from "@/i18n/strings";

type OnboardingChoice = { label: string; description: string; conditions: Condition[] };
type OnboardingCopy = {
  eyebrow: string;
  heading: string;
  body: string;
  choices: OnboardingChoice[];
  skip: string;
};

const onboardingCopy: Record<Language, OnboardingCopy> = {
  en: {
    eyebrow: "Welcome",
    heading: "What would you like help with?",
    body: "Pick what you are working on. You can change this later.",
    choices: [
      { label: "Blood pressure", description: "Keep your blood pressure in a safer range.", conditions: ["hypertension"] },
      { label: "Blood sugar", description: "Keep your blood sugar steadier.", conditions: ["diabetes"] },
      { label: "Both", description: "Work on blood pressure and blood sugar together.", conditions: ["hypertension", "diabetes"] }
    ],
    skip: "Skip for now"
  },
  es: {
    eyebrow: "Bienvenido",
    heading: "¿Con qué quieres ayuda?",
    body: "Elige en qué estás trabajando. Puedes cambiarlo más tarde.",
    choices: [
      { label: "Presión arterial", description: "Mantén tu presión arterial en un rango más seguro.", conditions: ["hypertension"] },
      { label: "Azúcar en sangre", description: "Mantén tu azúcar en sangre más estable.", conditions: ["diabetes"] },
      { label: "Ambas", description: "Trabaja en presión arterial y azúcar en sangre juntas.", conditions: ["hypertension", "diabetes"] }
    ],
    skip: "Omitir por ahora"
  }
};

export default function OnboardingPage() {
  const router = useRouter();
  const { state, dispatch } = useHealthState();
  const language = state.patient.language;
  const copy = onboardingCopy[language];

  function finish(conditions: Condition[]) {
    if (conditions.length > 0) {
      dispatch({ type: "completeOnboarding", conditions });
    }
    markOnboardingComplete();
    router.replace("/today");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 py-8 text-ink">
      <UrgentHelp language={language} />
      <div>
        <p className="text-sm font-medium text-care">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{copy.heading}</h1>
        <p className="mt-2 text-sm leading-6 text-ink/70">{copy.body}</p>
      </div>
      <div className="grid gap-3">
        {copy.choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            onClick={() => finish(choice.conditions)}
            className="flex min-h-16 flex-col items-start rounded-control border border-ink/15 bg-white p-4 text-left hover:border-care"
          >
            <span className="text-lg font-semibold">{choice.label}</span>
            <span className="mt-1 text-sm text-ink/70">{choice.description}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => finish([])} className="text-sm text-ink/60 underline">
        {copy.skip}
      </button>
    </main>
  );
}
