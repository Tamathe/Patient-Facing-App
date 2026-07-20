"use client";

import React, { useState } from "react";
import { AiDataDisclosure } from "@/components/ai-data-disclosure";
import { ACCESSIBILITY_PREFERENCE_LABELS, ACCESSIBILITY_PREFERENCES } from "@/domain/accessibility";
import type { AiDataMode } from "@/domain/privacy-disclosure";
import { type AccessibilityPreference, type AppState, type AuditEvent } from "@/domain/types";
import { tPrivacy } from "@/i18n/strings";

function formatLogTime(createdAt: string): string {
  const eventDate = new Date(createdAt);
  return Number.isNaN(eventDate.getTime()) ? "Date unavailable" : eventDate.toLocaleString();
}

const actionLabelMap: Record<AuditEvent["action"], string> = {
  created: "Data created",
  updated: "Data updated",
  ai_generated: "AI response generated",
  shared: "Shared with care team",
  exported: "Data exported",
  deleted: "Demo data deleted",
  crisis_escalated: "Crisis resources shown",
  assessment_recorded: "Check-in recorded",
  screening_scheduled: "Eye screening booked",
  screening_result_confirmed: "Screening result confirmed",
  referral_placed: "Referral placed",
  referral_escalated: "Referral escalated to care team",
  recall_scheduled: "Annual recall scheduled",
  referral_booked: "Referral appointment booked"
};

type PrivacyPanelProps = {
  state: AppState;
  aiDataMode?: AiDataMode;
  onReset: () => void;
  onExport: () => void;
  onRestoreDefaultDemo?: () => void;
  onUpdateAccessibility?: (preferences: AccessibilityPreference[]) => void;
};

function getDisplayLabel(event: AuditEvent): string {
  return event.label === event.action ? actionLabelMap[event.action] : event.label;
}

export function PrivacyPanel({
  state,
  aiDataMode = "checking",
  onReset,
  onExport,
  onRestoreDefaultDemo,
  onUpdateAccessibility
}: PrivacyPanelProps) {
  const activePreferences = state.patient.accessibilityPreferences ?? [];
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function togglePreference(preference: AccessibilityPreference) {
    const next = activePreferences.includes(preference)
      ? activePreferences.filter((item) => item !== preference)
      : [...activePreferences, preference];
    onUpdateAccessibility?.(next);
  }

  const eventsNewestFirst = [...state.auditEvents].sort((left, right) => {
    const leftDate = new Date(left.createdAt).getTime();
    const rightDate = new Date(right.createdAt).getTime();

    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) {
      return 0;
    }

    if (Number.isNaN(leftDate)) {
      return 1;
    }

    if (Number.isNaN(rightDate)) {
      return -1;
    }

    return rightDate - leftDate;
  });

  const displayedEvents = eventsNewestFirst.map((event) => ({
    ...event,
    displayLabel: getDisplayLabel(event)
  }));

  return (
    <div className="grid gap-5">
      <section className="rounded-control border border-care/20 bg-calm p-4">
        <h2 className="text-xl font-semibold">Your privacy promise</h2>
        <p className="mt-2 text-sm leading-6">No ads. No data monetization.</p>
        <p className="mt-2 text-sm leading-6">You control what you share, and you can download or delete your demo data at any time.</p>
        <p className="mt-2 text-sm leading-6">{tPrivacy(state.patient.language, "recordStorage")}</p>
        <AiDataDisclosure mode={aiDataMode} language={state.patient.language} />
      </section>
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Data controls</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-control bg-care px-4 py-2 text-sm font-semibold text-white"
            onClick={onExport}
            type="button"
          >
            Export my data
          </button>
          <button
            className="rounded-control border border-pulse px-4 py-2 text-sm font-semibold text-pulse"
            onClick={() => setConfirmingDelete(true)}
            type="button"
          >
            Delete demo data
          </button>
          {onRestoreDefaultDemo ? (
            <button
              className="rounded-control border border-care px-4 py-2 text-sm font-semibold text-care"
              onClick={onRestoreDefaultDemo}
              type="button"
            >
              Restore retinopathy walkthrough
            </button>
          ) : null}
        </div>
        {confirmingDelete ? (
          <div
            aria-label={tPrivacy(state.patient.language, "deleteTitle")}
            className="mt-4 rounded-control border border-pulse/30 bg-pulse/5 p-3"
            role="dialog"
          >
            <h3 className="font-semibold">{tPrivacy(state.patient.language, "deleteTitle")}</h3>
            <p className="mt-1 text-sm leading-6 text-ink/80">{tPrivacy(state.patient.language, "deleteBody")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-control bg-pulse px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  setConfirmingDelete(false);
                  onReset();
                }}
                type="button"
              >
                {tPrivacy(state.patient.language, "deleteConfirm")}
              </button>
              <button
                className="rounded-control border border-ink/20 px-4 py-2 text-sm font-semibold"
                onClick={() => setConfirmingDelete(false)}
                type="button"
              >
                {tPrivacy(state.patient.language, "deleteCancel")}
              </button>
            </div>
          </div>
        ) : null}
      </section>
      {onUpdateAccessibility ? (
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Display &amp; access</h2>
          <p className="mt-1 text-sm text-ink/70">Turn on the options that make this easier to use. They apply everywhere.</p>
          <div className="mt-3 grid gap-2">
            {ACCESSIBILITY_PREFERENCES.map((preference) => (
              <label key={preference} className="flex min-h-12 items-center gap-2 text-sm capitalize">
                <input
                  checked={activePreferences.includes(preference)}
                  onChange={() => togglePreference(preference)}
                  type="checkbox"
                />
                {ACCESSIBILITY_PREFERENCE_LABELS[preference]}
              </label>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Access log</h2>
        {eventsNewestFirst.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            {displayedEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.displayLabel}</strong> - {formatLogTime(event.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
