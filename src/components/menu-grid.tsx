"use client";

import { Camera, ClipboardList, HandHeart, HeartPulse, LockKeyhole, MessageCircle, NotebookPen, Pill, Stethoscope, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

type MenuItem = { href: string; label: string; description: string; icon: LucideIcon };
type MenuGroup = { title: string; items: MenuItem[] };

// The browse surface that replaces the flat 11-tab bar. Every destination the
// old bottom bar reached lives here (except the home itself, which is the Home
// nav item), so collapsing the bar orphans no route. menu-grid.test.tsx asserts
// that reachability invariant.
export const MENU_GROUPS: MenuGroup[] = [
  {
    title: "Track your health",
    items: [
      { href: "/numbers", label: "My Numbers", description: "Log blood pressure and see your trend", icon: HeartPulse },
      { href: "/medicines", label: "My Medicines", description: "Understand your medicines and adherence", icon: Pill },
      { href: "/food", label: "Food", description: "Ask about a food with the camera", icon: Camera }
    ]
  },
  {
    title: "Understand your care",
    items: [
      { href: "/plan", label: "My Plan", description: "Your care plan and instructions", icon: ClipboardList },
      { href: "/visits", label: "My Visits", description: "Get ready for your next visit", icon: Stethoscope },
      { href: "/chat", label: "Coach", description: "Ask a question about your care", icon: MessageCircle }
    ]
  },
  {
    title: "Check in and get support",
    items: [
      { href: "/checkin", label: "Check-in", description: "A short, private mood check-in", icon: NotebookPen },
      { href: "/support", label: "Support", description: "Find local food, housing, and utility help", icon: HandHeart }
    ]
  },
  {
    title: "Manage",
    items: [
      { href: "/intake", label: "Add Instructions", description: "Paste care instructions to review", icon: Upload },
      { href: "/privacy", label: "Privacy", description: "Export or delete your data", icon: LockKeyhole }
    ]
  }
];

export function MenuGrid() {
  return (
    <div className="space-y-6">
      {MENU_GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex min-h-16 items-start gap-3 rounded-control border border-ink/10 bg-white p-4 hover:border-care">
                  <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 flex-none text-care" />
                  <span>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="mt-1 block text-sm text-ink/70">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
