"use client";

import { Home, LayoutGrid } from "lucide-react";
import Link from "next/link";
import React, { type ReactNode } from "react";
import { UrgentHelp } from "./urgent-help";
import { tHome } from "@/i18n/home-strings";
import { useHealthState } from "@/state/store";

// The tab bar collapsed from 11 flat peers to a chat-first Home plus a single
// "All my health" browse menu. Every former destination stays reachable through
// /menu (see menu-grid.tsx); crisis help stays one tap away via the persistent
// UrgentHelp affordance in the header, on every screen.
const navItems = [
  { href: "/today", labelKey: "navHome" as const, icon: Home },
  { href: "/menu", labelKey: "navMenu" as const, icon: LayoutGrid }
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { state } = useHealthState();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm font-medium text-care">Home Health Ownership</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          <div className="w-1/2 max-w-xs">
            <UrgentHelp language={state.patient.language} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-ink/10 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                className="flex min-h-14 flex-col items-center justify-center rounded-control px-2 text-center text-sm font-medium text-ink hover:bg-calm"
                href={item.href}
              >
                <Icon aria-hidden="true" className="mb-1 h-5 w-5" />
                {tHome(state.patient.language, item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
