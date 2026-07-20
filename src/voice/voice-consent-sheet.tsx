"use client";

import React from "react";
import type { Language } from "@/i18n/strings";
import { tVoice } from "@/i18n/voice-strings";

export function VoiceConsentSheet({
  language,
  onAccept,
  onCancel
}: {
  language: Language;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="voice-consent-title"
      className="rounded-control border border-care/25 bg-calm p-4"
    >
      <h2 id="voice-consent-title" className="text-lg font-semibold">
        {tVoice(language, "consentTitle")}
      </h2>
      <p className="mt-2 text-sm leading-6">{tVoice(language, "consentIntro")}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
        <li>{tVoice(language, "consentListening")}</li>
        <li>{tVoice(language, "consentBrowserService")}</li>
        <li>{tVoice(language, "consentNoSave")}</li>
        <li>{tVoice(language, "consentTypeInstead")}</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="min-h-12 rounded-control bg-care px-4 py-2 font-semibold text-white"
        >
          {tVoice(language, "consentAccept")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-control border border-care px-4 py-2 font-semibold text-care"
        >
          {tVoice(language, "cancel")}
        </button>
      </div>
    </section>
  );
}
