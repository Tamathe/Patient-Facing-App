"use client";

import { useEffect, useState } from "react";
import { PrivacyPanel } from "@/components/privacy-panel";
import { AppShell } from "@/components/app-shell";
import { clearStoredState } from "@/state/storage";
import { useHealthState } from "@/state/store";
import { recordAuditEvent } from "@/domain/audit";
import { aiDataModeForVoiceTransport, type AiDataMode } from "@/domain/privacy-disclosure";

export default function PrivacyPage() {
  const { state, dispatch } = useHealthState();
  const [aiDataMode, setAiDataMode] = useState<AiDataMode>("checking");

  useEffect(() => {
    const controller = new AbortController();
    const passcode = new URLSearchParams(window.location.search).get("k") ?? undefined;

    void fetch("/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: state.patient.id, passcode, probe: true }),
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((result: unknown) => {
        if (typeof result === "object" && result !== null && "mode" in result) {
          const candidate = result as { mode?: "live" | "mock" | "error" | "blocked"; reason?: string };
          setAiDataMode(aiDataModeForVoiceTransport(candidate));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAiDataMode("cloud_text");
        }
      });

    return () => controller.abort();
  }, [state.patient.id]);

  function handleExport() {
    const exportEvent = recordAuditEvent(state.patient.id, "exported", "Data exported");
    dispatch({ type: "addAuditEvent", event: exportEvent });
    const nextStateForExport = {
      ...state,
      auditEvents: [...state.auditEvents, exportEvent]
    };
    const payload = JSON.stringify(nextStateForExport, null, 2);
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

  return (
    <AppShell title="Privacy">
      <PrivacyPanel
        state={state}
        aiDataMode={aiDataMode}
        onExport={handleExport}
        onReset={() => {
          clearStoredState();
          dispatch({ type: "deleteDemoData" });
        }}
        onRestoreDefaultDemo={() => dispatch({ type: "resetDemo" })}
        onUpdateAccessibility={(preferences) => dispatch({ type: "updateAccessibilityPreferences", preferences })}
        onUpdateLanguage={(language) => dispatch({ type: "setLanguage", language })}
      />
    </AppShell>
  );
}
