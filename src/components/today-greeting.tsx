"use client";

import { Activity, AlertTriangle, ArrowRight, LockKeyhole, MessageCircle, NotebookPen, Pill, Stethoscope, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import clsx from "clsx";
import type { TaskItem } from "@/domain/types";

export type ChipTone = "urgent" | "active" | "suggested";

// The chip's loudness mirrors the app's own epistemics: a reading that needs a
// same-day care-team touch (needs_review) is never dressed up as a friendly
// suggestion. The one carve-out is the first-reading nudge, which is
// needs_review for data-provenance reasons but is not time-sensitive.
export function chipTone(task: TaskItem): ChipTone {
  if (task.status === "needs_review") {
    return task.id === "task-bp-first" ? "active" : "urgent";
  }
  return task.status === "confirmed" ? "active" : "suggested";
}

const kindIcon: Record<TaskItem["kind"], LucideIcon> = {
  reading: Activity,
  medicine: Pill,
  visit: Stethoscope,
  checkin: NotebookPen,
  intake: Upload,
  privacy: LockKeyhole
};

const toneLabel: Record<ChipTone, string> = {
  urgent: "Reach your care team today",
  active: "Ready when you are",
  suggested: "Suggested for you"
};

function greetingForHour(hour: number): string {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function statusSummary(tasks: TaskItem[]): string {
  const urgent = tasks.filter((task) => chipTone(task) === "urgent").length;
  if (urgent > 0) {
    return urgent === 1 ? "1 thing needs your attention" : `${urgent} things need your attention`;
  }
  const active = tasks.filter((task) => chipTone(task) === "active").length;
  if (active > 0) {
    return active === 1 ? "1 thing to do today" : `${active} things to do today`;
  }
  return "Nothing urgent right now";
}

function TaskChip({ task }: { task: TaskItem }) {
  const tone = chipTone(task);
  const Icon = tone === "urgent" ? AlertTriangle : kindIcon[task.kind];
  // A chip that lands on the Coach carries its task id so the chat reconstructs
  // the exact prefilled, safety-screened turn — the same path a tapped
  // notification uses. Chips that land on a feature screen navigate plainly.
  const href = task.href === "/chat" ? `/chat?taskId=${task.id}` : task.href;
  return (
    <Link
      href={href}
      className={clsx(
        "flex min-h-14 items-start gap-3 rounded-control border p-4 transition-colors",
        tone === "urgent" && "border-pulse bg-pulse/5 hover:bg-pulse/10",
        tone === "active" && "border-care bg-white hover:bg-calm",
        tone === "suggested" && "border-ink/10 bg-white hover:border-care"
      )}
    >
      <Icon
        aria-hidden="true"
        className={clsx("mt-0.5 h-5 w-5 flex-none", tone === "urgent" ? "text-pulse" : tone === "active" ? "text-care" : "text-ink/40")}
      />
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span className={clsx("font-semibold", tone === "urgent" && "text-pulse")}>{task.title}</span>
          {tone === "urgent" ? (
            <span className="rounded-full border border-pulse px-2 py-0.5 text-[11px] font-medium text-pulse">urgent</span>
          ) : null}
        </span>
        <span className="mt-1 block text-sm leading-6 text-ink/75">{task.body}</span>
        <span className={clsx("mt-2 block text-xs font-medium", tone === "urgent" ? "text-pulse" : "text-ink/60")}>{toneLabel[tone]}</span>
      </span>
      <ArrowRight aria-hidden="true" className={clsx("mt-1 h-5 w-5 flex-none", tone === "urgent" ? "text-pulse" : "text-care")} />
    </Link>
  );
}

export function TodayGreeting({ patientName, tasks, now }: { patientName: string; tasks: TaskItem[]; now?: Date }) {
  // Resolve the time-of-day greeting on the client only. Rendering it during SSR
  // compares the server clock (UTC on Vercel) against the patient's local clock
  // at hydration and mismatches across hour boundaries. Tests pass `now`
  // explicitly to keep the greeting deterministic.
  const [resolvedNow, setResolvedNow] = React.useState<Date | null>(now ?? null);
  React.useEffect(() => {
    if (!now) {
      setResolvedNow(new Date());
    }
  }, [now]);
  const greeting = resolvedNow ? `${greetingForHour(resolvedNow.getHours())}, ${patientName}` : `Hello, ${patientName}`;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-care">{greeting}</p>
        <h2 className="mt-1 text-2xl font-semibold">{statusSummary(tasks)}</h2>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-calm text-care" aria-hidden="true">
          <MessageCircle className="h-4 w-4" />
        </span>
        <p className="rounded-control rounded-tl-none bg-calm px-3 py-2 text-sm leading-6 text-ink">
          Here is what matters at home today. Tap one to get started.
        </p>
      </div>
      <div className="grid gap-3">
        {tasks.map((task) => (
          <TaskChip key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
