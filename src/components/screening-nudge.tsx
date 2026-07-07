"use client";

import React, { useState } from "react";
import { ArrowRight, Copy, MessageCircle, Phone } from "lucide-react";
import { tScreening, type Language } from "@/i18n/strings";

// The SMS-style nudge landing (/screening?entry=sms): a carrier-style bubble
// rendered from the approved template, one giant action, and an honest
// "talk to someone" path that drafts a callback message instead of a queue.
export function ScreeningNudge({
  language,
  nudgeMessage,
  callbackMessage,
  onSeeTimes
}: {
  language: Language;
  nudgeMessage: string;
  callbackMessage: string;
  onSeeTimes: () => void;
}) {
  const [wantsCallback, setWantsCallback] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
          {tScreening(language, "nudgeSmsHeader")}
        </p>
        <div className="mt-2 flex items-start gap-2">
          <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-calm text-care">
            <MessageCircle className="h-4 w-4" />
          </span>
          <p className="rounded-control rounded-tl-none bg-calm px-4 py-3 text-sm leading-6 text-ink">{nudgeMessage}</p>
        </div>
      </div>

      <button
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-care px-4 py-3 text-base font-semibold text-white hover:opacity-90"
        onClick={onSeeTimes}
        type="button"
      >
        {tScreening(language, "nudgeSeeTimes")}
        <ArrowRight aria-hidden="true" className="h-5 w-5" />
      </button>

      {wantsCallback ? (
        <div className="rounded-control border border-ink/10 bg-white p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Phone aria-hidden="true" className="h-4 w-4 text-care" />
            {tScreening(language, "nudgeCallbackTitle")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-ink/75">{tScreening(language, "nudgeCallbackBody")}</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-control bg-paper p-3 text-sm leading-6 text-ink">{callbackMessage}</pre>
          <button
            className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care"
            onClick={() => {
              void navigator.clipboard?.writeText(callbackMessage).catch(() => undefined);
              setCopied(true);
            }}
            type="button"
          >
            <Copy aria-hidden="true" className="h-4 w-4" />
            {copied ? (language === "es" ? "Copiado" : "Copied") : language === "es" ? "Copiar mensaje" : "Copy message"}
          </button>
        </div>
      ) : (
        <button
          className="flex min-h-12 w-full items-center justify-center rounded-control border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink/80 hover:border-care"
          onClick={() => setWantsCallback(true)}
          type="button"
        >
          {tScreening(language, "nudgeTalkInstead")}
        </button>
      )}
    </section>
  );
}
