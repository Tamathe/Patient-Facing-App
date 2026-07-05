"use client";

import { Phone, Send, Share2 } from "lucide-react";
import React, { useState } from "react";
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
  blocked: "Blocked for safety"
};

const safetyGuidanceClass: Record<AiMessage["safety"], string> = {
  allowed: "text-emerald-700",
  escalate: "text-amber-700",
  blocked: "text-rose-700"
};

const bannerClass: Record<AiMessage["safety"], string> = {
  allowed: "border-ink/15 bg-calm text-ink",
  escalate: "border-amber-300 bg-amber-50 text-amber-900",
  blocked: "border-rose-300 bg-rose-50 text-rose-900"
};

type ConversationPanelProps = {
  messages: AiMessage[];
  onSubmit: (mode: AiMode, input: string) => void;
  clinic?: { name: string; phone: string };
  careTeamDraft?: string;
  describeSource?: (id: string) => string | null;
};

export function ConversationPanel({ messages, onSubmit, clinic, careTeamDraft, describeSource }: ConversationPanelProps) {
  const [mode, setMode] = useState<AiMode>("explain");
  const [input, setInput] = useState("");
  const [draftShared, setDraftShared] = useState(false);

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
            {message.role === "assistant" && message.actions && message.actions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.actions.includes("call_clinic") && clinic && clinic.phone ? (
                  <a
                    className="inline-flex min-h-11 items-center gap-2 rounded-control bg-care px-4 py-2 text-sm font-semibold text-white"
                    href={`tel:${clinic.phone}`}
                  >
                    <Phone aria-hidden="true" className="h-4 w-4" />
                    Call {clinic.name}
                  </a>
                ) : null}
                {message.actions.includes("draft_message") && careTeamDraft ? (
                  <button
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care"
                    onClick={shareDraft}
                    type="button"
                  >
                    <Share2 aria-hidden="true" className="h-4 w-4" />
                    Draft a message
                  </button>
                ) : null}
              </div>
            ) : null}
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
      <form
        action={() => {
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
            className="min-h-24 rounded-control border border-ink/20 px-3 py-2"
            onChange={(event) => setInput(event.target.value)}
            value={input}
          />
        </label>
        <button className="mt-3 inline-flex items-center gap-2 rounded-control bg-care px-4 py-2 font-semibold text-white" type="submit">
          <Send aria-hidden="true" className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}
