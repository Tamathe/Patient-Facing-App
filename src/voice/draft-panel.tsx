"use client";

import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { extractInstructionFacts } from "@/domain/instructions";
import { careContextInputSchema } from "@/domain/schemas";
import { classifyCrisis, classifySafety } from "@/domain/safety";
import { screenSocialEmergency } from "@/domain/social-screen";
import type { CareContextItem } from "@/domain/types";
import type { Language } from "@/i18n/strings";
import { tVoice } from "@/i18n/voice-strings";
import { useHealthState } from "@/state/store";
import { isSpeaking, speak, stopSpeaking, subscribeSpeaking } from "./tts";
import { useDictation } from "./use-dictation";
import { VoiceConsentSheet } from "./voice-consent-sheet";
import { useVoiceEntry } from "./voice-consent";
import { VoiceIndicator } from "./voice-indicator";

type DraftCopy = {
  open: string;
  title: string;
  intro: string;
  mic: string;
  typedLabel: string;
  review: string;
  conversation: string;
  staged: string;
  empty: string;
  undo: string;
  readBack: string;
  short: string;
  voiceUndoRefused: string;
  confirmed: string;
  confirm: string;
};

const copy: Record<Language, DraftCopy> = {
  en: {
    open: "Talk through your plan",
    title: "Talk through your plan",
    intro: "Each note becomes a draft. Confirm individual items before they join your plan.",
    mic: "Add a spoken plan note",
    typedLabel: "Type a plan note",
    review: "Stage typed note",
    conversation: "Conversation",
    staged: "Staged draft",
    empty: "Your spoken plan notes will appear here.",
    undo: "Undo last note",
    readBack: "Read draft aloud",
    short: "Please say a little more so I can make a useful plan note.",
    voiceUndoRefused: "That note has a confirmed item. Use the Undo button if you still want to remove it.",
    confirmed: "Confirmed",
    confirm: "Confirm"
  },
  es: {
    open: "Hablar sobre tu plan",
    title: "Hablar sobre tu plan",
    intro: "Cada nota se convierte en un borrador. Confirma cada punto antes de añadirlo a tu plan.",
    mic: "Agregar una nota hablada al plan",
    typedLabel: "Escribe una nota del plan",
    review: "Preparar nota escrita",
    conversation: "Conversación",
    staged: "Borrador preparado",
    empty: "Tus notas habladas del plan aparecerán aquí.",
    undo: "Deshacer la última nota",
    readBack: "Leer borrador",
    short: "Di un poco más para que pueda crear una nota útil para el plan.",
    voiceUndoRefused: "Esa nota tiene un punto confirmado. Usa el botón Deshacer si todavía quieres eliminarla.",
    confirmed: "Confirmado",
    confirm: "Confirmar"
  }
};

function isVoiceUndo(text: string, language: Language): boolean {
  const normalized = text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return language === "es"
    ? ["deshaz eso", "deshacer eso", "deshaz la ultima nota"].includes(normalized)
    : ["undo that", "undo it", "undo the last note"].includes(normalized);
}

export function DraftPanel() {
  const { state, dispatch } = useHealthState();
  const router = useRouter();
  const language = state.patient.language;
  const labels = copy[language];
  const [open, setOpen] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [speaking, setSpeaking] = useState(() => isSpeaking());
  const [typedTwin, setTypedTwin] = useState("");
  const [turns, setTurns] = useState<Array<{ id: string; text: string }>>([]);
  const [voiceItemIds, setVoiceItemIds] = useState<string[]>([]);
  const turnNumber = useRef(0);
  const shortReprompted = useRef(false);
  const { consentRequired, grantConsent, onSessionStart } = useVoiceEntry({
    patientId: state.patient.id,
    dispatch
  });

  useEffect(() => subscribeSpeaking(setSpeaking), []);
  useEffect(() => () => stopSpeaking(), []);

  const undoLast = useCallback((viaVoice: boolean): void => {
    const contextItemId = voiceItemIds.at(-1);
    if (!contextItemId) return;
    const facts = state.extractedFacts.filter((fact) => fact.contextItemId === contextItemId);
    if (viaVoice && facts.some((fact) => fact.status !== "needs_review")) {
      void speak(labels.voiceUndoRefused, { language });
      return;
    }
    dispatch({ type: "removeContextItem", contextItemId });
    setVoiceItemIds((ids) => ids.filter((id) => id !== contextItemId));
  }, [dispatch, labels.voiceUndoRefused, language, state.extractedFacts, voiceItemIds]);

  const handleTranscript = useCallback((rawText: string): void => {
    const text = rawText.trim();
    if (!text) return;
    setTurns((current) => [...current, { id: crypto.randomUUID(), text }]);

    if (isVoiceUndo(text, language)) {
      undoLast(true);
      return;
    }

    if (
      classifyCrisis(text).matched ||
      classifySafety(text).level !== "allowed" ||
      screenSocialEmergency(text)
    ) {
      router.push(`/chat?ask=${encodeURIComponent(text)}`);
      return;
    }

    turnNumber.current += 1;
    const parsed = careContextInputSchema.safeParse({
      title: `Voice note ${turnNumber.current}`,
      rawText: text,
      sourceLabel: tVoice(language, "draftSourceLabel")
    });
    if (!parsed.success) {
      if (!shortReprompted.current) {
        shortReprompted.current = true;
        void speak(labels.short, { language });
      }
      return;
    }

    shortReprompted.current = false;
    const item: CareContextItem = {
      id: crypto.randomUUID(),
      patientId: state.patient.id,
      title: parsed.data.title,
      rawText: parsed.data.rawText,
      sourceLabel: parsed.data.sourceLabel,
      createdAt: new Date().toISOString()
    };
    const facts = extractInstructionFacts(item);
    dispatch({ type: "addContextItem", item, facts });
    setVoiceItemIds((ids) => [...ids, item.id]);
    const factLabels = facts.map((fact) => fact.label).join(", ");
    const summary = language === "es"
      ? `Anoté ${facts.length} ${facts.length === 1 ? "punto" : "puntos"}: ${factLabels}. Toca confirmar para añadir cualquiera a tu plan.`
      : `I noted ${facts.length} ${facts.length === 1 ? "item" : "items"}: ${factLabels}. Tap confirm on any to add it to your plan.`;
    void speak(summary, { language });
  }, [dispatch, labels.short, language, router, state.patient.id, undoLast]);

  const dictation = useDictation({ language, onFinalTranscript: handleTranscript });

  function startVoice(): void {
    stopSpeaking();
    if (consentRequired) {
      setShowConsent(true);
      return;
    }
    onSessionStart("care plan draft");
    dictation.start();
  }

  function acceptConsent(): void {
    grantConsent();
    setShowConsent(false);
    onSessionStart("care plan draft");
    dictation.start();
  }

  function readBack(): void {
    const localIds = new Set(voiceItemIds);
    const facts = state.extractedFacts.filter(
      (fact) => fact.status === "confirmed" || (localIds.has(fact.contextItemId) && fact.status === "needs_review")
    );
    const text = language === "es"
      ? `Resumen del borrador. ${facts.length > 0 ? facts.map((fact) => fact.value).join(". ") : "No hay puntos todavía."}`
      : `Draft summary. ${facts.length > 0 ? facts.map((fact) => fact.value).join(". ") : "There are no items yet."}`;
    void speak(text, { language });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-12 rounded-control border border-care bg-white px-4 py-2 font-semibold text-care"
      >
        {labels.open}
      </button>
    );
  }

  const localIdSet = new Set(voiceItemIds);
  const voiceItems = state.contextItems.filter((item) => localIdSet.has(item.id));

  return (
    <section className="rounded-control border border-care/25 bg-calm p-4">
      <h2 className="text-xl font-semibold">{labels.title}</h2>
      <p className="mt-1 text-sm leading-6 text-ink/75">{labels.intro}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startVoice}
          disabled={!dictation.supported}
          className="inline-flex min-h-12 items-center gap-2 rounded-control bg-care px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          <Mic aria-hidden="true" className="h-4 w-4" />
          {labels.mic}
        </button>
        <button
          type="button"
          onClick={() => undoLast(false)}
          disabled={voiceItemIds.length === 0}
          className="min-h-12 rounded-control border border-care px-3 py-2 font-semibold text-care disabled:opacity-50"
        >
          {labels.undo}
        </button>
        <button type="button" onClick={readBack} className="min-h-12 rounded-control border border-care px-3 py-2 font-semibold text-care">
          {labels.readBack}
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
      {showConsent ? <div className="mt-3"><VoiceConsentSheet language={language} onAccept={acceptConsent} onCancel={() => setShowConsent(false)} /></div> : null}
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleTranscript(typedTwin);
          setTypedTwin("");
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h3 className="font-semibold">{labels.conversation}</h3>
          {turns.length === 0 ? <p className="mt-2 text-sm text-ink/65">{labels.empty}</p> : null}
          <div className="mt-3 grid gap-2">
            {turns.map((turn) => (
              <p key={turn.id} className="rounded-control bg-calm px-3 py-2 text-sm">{turn.text}</p>
            ))}
          </div>
        </section>
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h3 className="font-semibold">{labels.staged}</h3>
          {voiceItems.length === 0 ? <p className="mt-2 text-sm text-ink/65">{labels.empty}</p> : null}
          <div className="mt-3 grid gap-3">
            {voiceItems.map((item) => {
              const facts = state.extractedFacts.filter((fact) => fact.contextItemId === item.id);
              return (
                <article key={item.id} className="rounded-control border border-ink/10 p-3">
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="mt-1 break-all text-xs text-ink/60">{item.id}</p>
                  <div className="mt-2 grid gap-2">
                    {facts.map((fact) => (
                      <div key={fact.id} className="rounded-control bg-calm p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <strong>{fact.label}</strong>
                          <span className="text-xs font-semibold">{fact.status === "confirmed" ? labels.confirmed : "Needs review"}</span>
                        </div>
                        <p className="mt-1">{fact.value}</p>
                        <blockquote className="mt-2 border-l-2 border-care/40 pl-2 text-ink/65">{fact.sourceSnippet}</blockquote>
                        <button
                          type="button"
                          aria-label={`${labels.confirm} ${fact.label}`}
                          disabled={fact.status === "confirmed"}
                          onClick={() => dispatch({ type: "confirmFact", factId: fact.id })}
                          className="mt-2 rounded-control bg-care px-3 py-2 font-semibold text-white disabled:opacity-60"
                        >
                          {fact.status === "confirmed" ? labels.confirmed : labels.confirm}
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
