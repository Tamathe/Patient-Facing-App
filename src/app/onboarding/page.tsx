"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markOnboardingComplete } from "@/state/storage";
import { useHealthState } from "@/state/store";
import type { Condition } from "@/domain/types";

// A short first-run step so the app is tuned to what the patient is working on,
// instead of defaulting everyone to the hypertension demo. English-gated per the
// composer precedent: a Spanish patient skips straight to the home (their care
// plan still drives everything from its primary condition).
export default function OnboardingPage() {
  const router = useRouter();
  const { state, dispatch } = useHealthState();

  useEffect(() => {
    if (state.patient.language === "es") {
      markOnboardingComplete();
      router.replace("/today");
    }
  }, [state.patient.language, router]);

  function finish(conditions: Condition[]) {
    if (conditions.length > 0) {
      dispatch({ type: "completeOnboarding", conditions });
    }
    markOnboardingComplete();
    router.replace("/today");
  }

  const choices: Array<{ label: string; description: string; conditions: Condition[] }> = [
    { label: "Blood pressure", description: "Keep your blood pressure in a safer range.", conditions: ["hypertension"] },
    { label: "Blood sugar", description: "Keep your blood sugar steadier.", conditions: ["diabetes"] },
    { label: "Both", description: "Work on blood pressure and blood sugar together.", conditions: ["hypertension", "diabetes"] }
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-10 text-ink">
      <div>
        <p className="text-sm font-medium text-care">Welcome</p>
        <h1 className="mt-1 text-2xl font-semibold">What would you like help with?</h1>
        <p className="mt-2 text-sm leading-6 text-ink/70">Pick what you are working on. You can change this later.</p>
      </div>
      <div className="grid gap-3">
        {choices.map((choice) => (
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
        Skip for now
      </button>
    </main>
  );
}
