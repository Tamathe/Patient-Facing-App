"use client";

import { Send } from "lucide-react";
import React, { useState } from "react";
import { tSafety, type Language } from "@/i18n/strings";
import { MessageActions } from "./message-actions";
import type { AiMessage, AiMode } from "@/domain/types";

const modes: Array<{ mode: AiMode; label: string }> = [
  { mode: "explain", label: "Explain this" },
  { mode: "today", label: "Help me do today" },
  { mode: "why", label: "Why does this matter?" },
  { mode: "ask", label: "What should I ask?" },
  { mode: "trouble", label: "I am having trouble" },
  { mode: "visit", label: "Prepare for my visit" },
  { mode: "summarize", label: "Summarize for someone" },
  { mode: "food", label: "Food question" }
];

const safetyGuidanceText: Record<AiMessage["safety"], string> = {
  allowed: "Safe to continue",
  escalate: "Escalate to care now",
  blocked: "Blocked for safety",
  crisis: "Crisis support — reach out now"
};

const safetyGuidanceClass: Record<AiMessage["safety"], string> = {
  allowed: "text-emerald-700",
  escalate: "text-amber-700",
  blocked: "text-rose-700",
  crisis: "text-rose-800"
};

const bannerClass: Record<AiMessage["safety"], string> = {
  allowed: "border-ink/15 bg-calm text-ink",
  escalate: "border-amber-300 bg-amber-50 text-amber-900",
  blocked: "border-rose-300 bg-rose-50 text-rose-900",
  crisis: "border-rose-400 bg-rose-100 text-rose-900"
};

type ConversationPanelProps = {
  messages: AiMessage[];
  onSubmit: (mode: AiMode, input: string) => void;
  clinic?: { name: string; phone: string };
  careTeamDraft?: string;
  describeSource?: (id: string) => string | null;
  language?: Language;
  onAcknowledgeCrisis?: (messageId: string) => void;
};

export function ConversationPanel({
  messages,
  onSubmit,
  clinic,
  careTeamDraft,
  describeSource,
  language = "en",
  onAcknowledgeCrisis
}: ConversationPanelProps) {
  const [mode, setMode] = useState<AiMode>("explain");
  const [input, setInput] = useState("");
  const [draftShared, setDraftShared] = useState(false);

  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const crisisLock = Boolean(
    latestAssistant && latestAssistant.safety === "crisis" && !latestAssistant.acknowledged
  );

  async function shareDraft() {
    if (!careTeamDraft) {
      return;
    }

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "For my care team", text: careTeamDraft });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(careTeamDraft);
      }
      setDraftShared(true);
    } catch {
      // sharing is best-effort; nothing leaves the device unless the patient confirms
    }
  }

  function renderSources(message: AiMessage) {
    if (message.sources.length === 0) {
      return null;
    }

    if (describeSource) {
      const labels = message.sources.map(describeSource).filter((label): label is string => Boolean(label));
      if (labels.length === 0) {
        return null;
      }
      return <p className="mt-2 text-xs text-ink/60">Based on {labels.join(", ")}.</p>;
    }

    return null;
  }

  function renderActions(message: AiMessage) {
    const actions = message.actions ?? [];
    if (message.role !== "assistant" || actions.length === 0) {
      return null;
    }

    return (
      <MessageActions
        actions={actions}
        language={language}
        clinic={clinic}
        onDraft={careTeamDraft ? shareDraft : undefined}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((item) => (
          <button
            className={`rounded-control border px-3 py-2 text-sm font-medium ${mode === item.mode ? "border-care bg-calm text-care" : "border-ink/15 bg-white"}`}
            key={item.mode}
            onClick={() => setMode(item.mode)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {messages.map((message) => (
          <article
            className={`rounded-control p-3 text-sm leading-6 ${message.role === "assistant" ? "bg-white" : "bg-calm"}`}
            key={message.id}
          >
            {message.role === "assistant" && message.banner ? (
              <p className={`mb-2 rounded-control border p-2 text-sm font-medium ${bannerClass[message.safety]}`} role="alert">
                {message.banner}
              </p>
            ) : null}
            <p>{message.content}</p>
            {renderActions(message)}
            {message.role === "assistant" && draftShared && message.actions?.includes("draft_message") ? (
              <p className="mt-2 text-xs text-ink/60">Draft ready — check your share sheet or clipboard, then send it to your team.</p>
            ) : null}
            {message.role === "assistant" ? (
              <p className={`mt-2 text-xs font-semibold ${safetyGuidanceClass[message.safety]}`}>
                Safety guidance: {safetyGuidanceText[message.safety]}
              </p>
            ) : null}
            {renderSources(message)}
          </article>
        ))}
      </div>
      {crisisLock && latestAssistant ? (
        <div className="grid gap-2 rounded-control border border-rose-300 bg-rose-50 p-3">
          <p className="text-sm font-medium text-rose-900">
            The message box is paused so the support options above stay in view. When you are ready, you can continue.
          </p>
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-control border border-rose-600 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
            onClick={() => onAcknowledgeCrisis?.(latestAssistant.id)}
            type="button"
          >
            {tSafety(language, "crisisAcknowledge")}
          </button>
        </div>
      ) : null}
      <form
        action={() => {
          if (crisisLock) {
            return;
          }
          const trimmed = input.trim();
          if (trimmed.length === 0) {
            return;
          }
          onSubmit(mode, trimmed);
          setInput("");
        }}
        className="rounded-control border border-ink/10 bg-white p-3"
      >
        <label className="grid gap-1 text-sm font-medium">
          Message
          <textarea
            className="min-h-24 rounded-control border border-ink/20 px-3 py-2 disabled:bg-ink/5"
            disabled={crisisLock}
            onChange={(event) => setInput(event.target.value)}
            value={input}
          />
        </label>
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-control bg-care px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={crisisLock}
          type="submit"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}
