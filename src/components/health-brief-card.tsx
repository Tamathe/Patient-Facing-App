import React from "react";
import type { HealthBrief } from "@/domain/types";

export function HealthBriefCard({ brief }: { brief: HealthBrief }) {
  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">My Health Brief</h2>
          <p className="text-sm text-ink/65">Generated {new Date(brief.generatedAt).toLocaleString()}</p>
        </div>
        <button
          className="rounded-control border border-care px-3 py-2 text-sm font-semibold text-care"
          onClick={() => window.print()}
          type="button"
        >
          Print
        </button>
      </div>
      <div className="mt-4 grid gap-4">
        {brief.sections.map((section) => (
          <section key={section.title} className="border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{section.title}</h3>
              <span className="rounded-control bg-calm px-2 py-1 text-xs font-medium text-care">
                {section.status.replace("_", " ")}
              </span>
            </div>
            <ul className="mt-2 grid gap-1 text-sm leading-6">
              {section.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
