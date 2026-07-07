 "use client";

import { PrivacyPanel } from "@/components/privacy-panel";
import { AppShell } from "@/components/app-shell";
import { clearStoredState } from "@/state/storage";
import { useHealthState } from "@/state/store";
import { recordAuditEvent } from "@/domain/audit";

export default function PrivacyPage() {
  const { state, dispatch } = useHealthState();

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
        onExport={handleExport}
        onReset={() => {
          clearStoredState();
          dispatch({ type: "deleteDemoData" });
        }}
        onRestoreDefaultDemo={() => dispatch({ type: "resetDemo" })}
        onUpdateAccessibility={(preferences) => dispatch({ type: "updateAccessibilityPreferences", preferences })}
      />
    </AppShell>
  );
}
