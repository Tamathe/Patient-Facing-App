 "use client";

import { PrivacyPanel } from "@/components/privacy-panel";
import { AppShell } from "@/components/app-shell";
import { clearStoredState } from "@/state/storage";
import { useHealthState } from "@/state/store";

export default function PrivacyPage() {
  const { state, dispatch } = useHealthState();

  return (
    <AppShell title="Privacy">
      <PrivacyPanel
        state={state}
        onReset={() => {
          clearStoredState();
          dispatch({ type: "resetDemo" });
        }}
      />
    </AppShell>
  );
}
