import React from "react";
import type { HealthBrief } from "@/domain/types";

export function HealthBriefCard({ brief }: { brief: HealthBrief }) {
  const canShare = typeof navigator.share === "function";
  const textContent = [
    `My Health Brief`,
    `Generated ${new Date(brief.generatedAt).toLocaleString()}`,
    "",
    ...brief.sections.flatMap((section) => [
      section.title,
      `Status: ${section.status.replace("_", " ")}`,
      ...section.items.map((item) => `- ${item}`),
      ""
    ])
  ].join("\n");

  const downloadBrief = () => {
    const file = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const useObjectURL = typeof URL.createObjectURL === "function";
    const href = useObjectURL ? URL.createObjectURL(file) : `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`;
    const anchor = document.createElement("a");

    anchor.href = href;
    anchor.download = `health-brief-${brief.patientId}.txt`;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    if (useObjectURL) {
      URL.revokeObjectURL(href);
    }
  };

  const handleShare = async () => {
    if (canShare) {
      try {
        await navigator.share({
          title: "My Health Brief",
          text: textContent
        });
        return;
      } catch {
      }
    }

    downloadBrief();
  };

  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">My Health Brief</h2>
          <p className="text-sm text-ink/65">Generated {new Date(brief.generatedAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-control border border-care px-3 py-2 text-sm font-semibold text-care"
            onClick={() => window.print()}
            type="button"
          >
            Print
          </button>
          <button
            className="rounded-control border border-care px-3 py-2 text-sm font-semibold text-care"
            onClick={handleShare}
            type="button"
          >
            {canShare ? "Share" : "Download"}
          </button>
        </div>
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
