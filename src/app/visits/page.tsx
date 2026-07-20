"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { HealthBriefCard } from "@/components/health-brief-card";
import { recordAuditEvent } from "@/domain/audit";
import { buildHealthBrief } from "@/domain/health-brief";
import { useHealthState } from "@/state/store";

export default function VisitsPage() {
  const { state, dispatch } = useHealthState();
  const [generatedAt, setGeneratedAt] = useState<string>("");

  useEffect(() => {
    setGeneratedAt(new Date().toISOString());
  }, []);

  const brief = useMemo(() => buildHealthBrief(state, { generatedAt }), [state, generatedAt]);
  const recordBriefShare = (label: string) => {
    dispatch({
      type: "addAuditEvent",
      event: recordAuditEvent(state.patient.id, "shared", label)
    });
  };

  return (
    <AppShell title="My Visits">
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">Prepare a better care conversation</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            Review this before your appointment, show it on your phone, or print it.
          </p>
        </section>
        <HealthBriefCard
          brief={brief}
          language={state.patient.language}
          onDownload={() => recordBriefShare("Health Brief downloaded")}
          onPrint={() => recordBriefShare("Health Brief printed")}
          onShare={() => recordBriefShare("Health Brief shared")}
        />
      </div>
    </AppShell>
  );
}
