import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { HealthBrief } from "@/domain/types";

type HealthBriefCardProps = {
  brief: HealthBrief;
  onDownload?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
};

export function HealthBriefCard({ brief, onDownload, onPrint, onShare }: HealthBriefCardProps) {
  const [canShare, setCanShare] = useState(false);
  const generatedLabel = useMemo(() => {
    const generatedAt = new Date(brief.generatedAt);
    return Number.isNaN(generatedAt.getTime())
      ? "Not available yet"
      : generatedAt.toLocaleString();
  }, [brief.generatedAt]);

  const getGeneratedLabel = (fallbackToNow = false) => {
    const generatedAt = new Date(brief.generatedAt);
    if (!Number.isNaN(generatedAt.getTime())) {
      return generatedAt.toLocaleString();
    }

    return fallbackToNow ? new Date().toLocaleString() : "Not available yet";
  };

  const buildTextContent = useCallback((generatedAtLabel: string) => [
    "My Health Brief",
    `Generated ${generatedAtLabel}`,
    "",
    ...brief.sections.flatMap((section) => [
      section.title,
      `Status: ${section.status.replace("_", " ")}`,
      ...section.items.map((item) => `- ${item}`),
      ""
    ])
  ].join("\n"), [brief.sections]);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  const textContent = useMemo(() => buildTextContent(generatedLabel), [buildTextContent, generatedLabel]);
  const exportTextContent = () => buildTextContent(getGeneratedLabel(true));

  const downloadBrief = (content = textContent) => {
    const file = new Blob([content], { type: "text/plain;charset=utf-8" });
    const useObjectURL = typeof URL.createObjectURL === "function";
    const href = useObjectURL ? URL.createObjectURL(file) : `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
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
    const hasShareApi = canShare && typeof navigator.share === "function";
    const shareText = exportTextContent();

    if (!hasShareApi) {
      downloadBrief(shareText);
      onDownload?.();
      return;
    }

    try {
      await navigator.share({
        title: "My Health Brief",
        text: shareText
      });
      onShare?.();
      return;
    } catch {
      return;
    }
  };

  return (
    <article className="health-brief-card rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">My Health Brief</h2>
          <p className="text-sm text-ink/65">Generated {generatedLabel}</p>
        </div>
        <div className="health-brief-card__actions flex gap-2">
          <button
            className="rounded-control border border-care px-3 py-2 text-sm font-semibold text-care"
            onClick={() => {
              onPrint?.();
              window.print();
            }}
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
        {brief.sections.map((section, sectionIndex) => (
          <section key={`${section.title}-${sectionIndex}`} className="border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{section.title}</h3>
              <span className="rounded-control bg-calm px-2 py-1 text-xs font-medium text-care">
                {section.status.replace("_", " ")}
              </span>
            </div>
            <ul className="mt-2 grid gap-1 text-sm leading-6">
              {section.items.map((item, itemIndex) => (
                <li key={`${sectionIndex}-${itemIndex}`}>- {item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
