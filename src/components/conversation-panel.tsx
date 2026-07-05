"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import type { AiMessage, AiMode } from "@/domain/types";
import React from "react";

const modes: Array<{ mode: AiMode; label: string }> = [
  { mode: "explain", label: "Explain this" },
  { mode: "today", label: "Help me do today" },
  { mode: "why", label: "Why does this matter?" },
  { mode: "ask", label: "What should I ask?" },
  { mode: "trouble", label: "I am having trouble" },
  { mode: "visit", label: "Prepare for my visit" },
  { mode: "summarize", label: "Summarize for someone" }
];

type ConversationPanelProps = {
  messages: AiMessage[];
  onSubmit: (mode: AiMode, input: string) => void;
};

export function ConversationPanel({ messages, onSubmit }: ConversationPanelProps) {
  const [mode, setMode] = useState<AiMode>("explain");
  const [input, setInput] = useState("");

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
            <p>{message.content}</p>
            {message.sources.length > 0 ? <p className="mt-2 text-xs text-ink/60">Sources: {message.sources.join(", ")}</p> : null}
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
