"use client";

import { AppShell } from "@/components/app-shell";
import { MenuGrid } from "@/components/menu-grid";

export default function MenuPage() {
  return (
    <AppShell title="All my health">
      <MenuGrid />
    </AppShell>
  );
}
