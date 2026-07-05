"use client";

import { IntakeReviewCard } from "@/components/intake-review-card";
import { careContextInputSchema } from "@/domain/schemas";
import { extractInstructionFacts } from "@/domain/instructions";
import type { CareContextItem } from "@/domain/types";
import { AppShell } from "@/components/app-shell";
import { useHealthState } from "@/state/store";

export default function IntakePage() {
  const { state, dispatch } = useHealthState();

  function handleSubmit(formData: FormData) {
    const parsed = careContextInputSchema.safeParse({
      title: formData.get("title"),
      rawText: formData.get("rawText"),
      sourceLabel: formData.get("sourceLabel")
    });

    if (!parsed.success) {
      return;
    }

    const item: CareContextItem = {
      id: crypto.randomUUID(),
      patientId: state.patient.id,
      title: parsed.data.title,
      rawText: parsed.data.rawText,
      sourceLabel: parsed.data.sourceLabel,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: "addContextItem", item, facts: extractInstructionFacts(item) });
  }

  return (
    <AppShell title="Add Instructions">
      <div className="grid gap-5">
        <form action={handleSubmit} className="rounded-control border border-ink/10 bg-white p-4">
          <label className="grid gap-1 text-sm font-medium">
            Title
            <input className="rounded-control border border-ink/20 px-3 py-2" name="title" />
          </label>
          <label className="mt-3 grid gap-1 text-sm font-medium">
            Source
            <input className="rounded-control border border-ink/20 px-3 py-2" name="sourceLabel" />
          </label>
          <label className="mt-3 grid gap-1 text-sm font-medium">
            Paste instructions
            <textarea className="min-h-36 rounded-control border border-ink/20 px-3 py-2" name="rawText" />
          </label>
          <button className="mt-4 rounded-control bg-care px-4 py-2 font-semibold text-white" type="submit">
            Interpret instructions
          </button>
        </form>
        <section className="grid gap-3">
          {state.extractedFacts.map((fact) => (
            <IntakeReviewCard key={fact.id} fact={fact} onConfirm={() => dispatch({ type: "confirmFact", factId: fact.id })} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
