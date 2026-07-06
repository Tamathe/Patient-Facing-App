"use client";

import { AppShell } from "@/components/app-shell";
import { MenuGrid } from "@/components/menu-grid";
import { tHome } from "@/i18n/home-strings";
import { useHealthState } from "@/state/store";

export default function MenuPage() {
  const { state } = useHealthState();
  return (
    <AppShell title={tHome(state.patient.language, "navMenu")}>
      <MenuGrid language={state.patient.language} />
    </AppShell>
  );
}
