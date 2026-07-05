import { ClipboardList, HeartPulse, Home, LockKeyhole, MessageCircle, Pill, Stethoscope, Upload } from "lucide-react";
import Link from "next/link";
import React, { type ReactNode } from "react";

const navItems = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/plan", label: "My Plan", icon: ClipboardList },
  { href: "/numbers", label: "My Numbers", icon: HeartPulse },
  { href: "/medicines", label: "My Medicines", icon: Pill },
  { href: "/visits", label: "My Visits", icon: Stethoscope },
  { href: "/intake", label: "Add Instructions", icon: Upload },
  { href: "/chat", label: "Coach", icon: MessageCircle },
  { href: "/privacy", label: "Privacy", icon: LockKeyhole }
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-medium text-care">Home Health Ownership</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          <Link className="rounded-control bg-care px-4 py-2 text-sm font-semibold text-white" href="/intake">
            Add
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-40 sm:pb-28">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-ink/10 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-2 py-2 sm:grid-cols-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} className="flex min-h-14 flex-col items-center justify-center rounded-control px-1 text-center text-xs font-medium text-ink hover:bg-calm" href={item.href}>
                <Icon aria-hidden="true" className="mb-1 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
