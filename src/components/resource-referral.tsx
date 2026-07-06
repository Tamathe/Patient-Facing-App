"use client";

import React, { useState } from "react";
import { Share2 } from "lucide-react";
import type { Language } from "@/i18n/strings";
import type { KentuckySdohResource } from "@/domain/sdoh-resources";

// A single resource card with a per-referral consent step. The share action is
// blocked until the patient explicitly agrees to share this specific referral.
export function ResourceReferral({
  resource,
  language,
  onShare
}: {
  resource: KentuckySdohResource;
  language: Language;
  onShare: (resource: KentuckySdohResource) => void;
}) {
  const [consented, setConsented] = useState(false);
  const [shared, setShared] = useState(false);

  const consentLabel =
    language === "es"
      ? "Acepto compartir esta referencia con mi equipo de salud"
      : "I agree to share this referral with my care team";

  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <h4 className="font-semibold">{resource.name}</h4>
      <p className="mt-1 text-sm leading-6 text-ink/75">{resource.summary}</p>
      <p className="mt-1 text-sm font-medium">{resource.contact}</p>
      <p className="mt-1 text-xs text-ink/60">
        Source: {resource.sourceName} · verified {resource.verifiedAt}
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input checked={consented} onChange={(event) => setConsented(event.target.checked)} type="checkbox" />
        {consentLabel}
      </label>
      <button
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care disabled:opacity-50"
        disabled={!consented || shared}
        onClick={() => {
          onShare(resource);
          setShared(true);
        }}
        type="button"
      >
        <Share2 aria-hidden="true" className="h-4 w-4" />
        {shared
          ? language === "es"
            ? "Compartido"
            : "Shared"
          : language === "es"
            ? "Compartir esta referencia"
            : "Share this referral"}
      </button>
    </article>
  );
}
