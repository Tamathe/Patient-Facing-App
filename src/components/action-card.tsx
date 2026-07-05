import React from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { TaskItem } from "@/domain/types";

export function ActionCard({ task }: { task: TaskItem }) {
  return (
    <Link
      className="block rounded-control border border-ink/10 bg-white p-4 shadow-sm hover:border-care"
      href={task.href}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{task.title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">{task.body}</p>
        </div>
        <ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-care" />
      </div>
    </Link>
  );
}
