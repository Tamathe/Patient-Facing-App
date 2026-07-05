"use client";

import React from "react";
import { type AppState } from "@/domain/types";

function formatLogTime(createdAt: string): string {
  const eventDate = new Date(createdAt);
  return Number.isNaN(eventDate.getTime()) ? "Date unavailable" : eventDate.toLocaleString();
}

type PrivacyPanelProps = {
  state: AppState;
  onReset: () => void;
};

export function PrivacyPanel({ state, onReset }: PrivacyPanelProps) {
  function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const file = new Blob([payload], { type: "application/json" });
    const canCreateObjectURL = typeof URL.createObjectURL === "function";
    const href = canCreateObjectURL
      ? URL.createObjectURL(file)
      : `data:application/json;charset=utf-8,${encodeURIComponent(payload)}`;
    const link = document.createElement("a");

    link.href = href;
    link.download = `home-health-data-${state.patient.id}.json`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (canCreateObjectURL) {
      URL.revokeObjectURL(href);
    }
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

  return (
    <div className="grid gap-5">
      <section className="rounded-control border border-care/20 bg-calm p-4">
        <h2 className="text-xl font-semibold">Your privacy promise</h2>
        <p className="mt-2 text-sm leading-6">No ads. No data monetization.</p>
        <p className="mt-2 text-sm leading-6">You control what you share, and you can download or delete your demo data at any time.</p>
        <p className="mt-2 text-sm leading-6">This prototype keeps your data in browser storage on this device.</p>
      </section>
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Data controls</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-control bg-care px-4 py-2 text-sm font-semibold text-white"
            onClick={exportData}
            type="button"
          >
            Export my data
          </button>
          <button
            className="rounded-control border border-pulse px-4 py-2 text-sm font-semibold text-pulse"
            onClick={onReset}
            type="button"
          >
            Delete demo data
          </button>
        </div>
      </section>
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Access log</h2>
        {eventsNewestFirst.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            {eventsNewestFirst.map((event) => (
              <li key={event.id}>
                <strong>{event.label}</strong> - {event.action} - {formatLogTime(event.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
