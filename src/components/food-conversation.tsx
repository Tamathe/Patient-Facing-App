"use client";

import React from "react";
import type { AiMessage } from "@/domain/types";

export function FoodConversation({ messages, partialAssistantText }: { messages: AiMessage[]; partialAssistantText: string }) {
  if (messages.length === 0 && partialAssistantText.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {messages.map((message) => (
        <article
          key={message.id}
          className={`rounded-control p-3 text-sm leading-6 ${message.role === "assistant" ? "bg-white" : "bg-calm"}`}
        >
          <p>{message.content}</p>
        </article>
      ))}
      {partialAssistantText.length > 0 ? (
        <article className="rounded-control bg-white p-3 text-sm leading-6 text-ink/70">
          <p>{partialAssistantText}</p>
        </article>
      ) : null}
    </div>
  );
}
