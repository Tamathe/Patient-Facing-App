"use client";

import React from "react";
import { Printer } from "lucide-react";
import { gradeStringKey } from "@/domain/dr-triage";
import { getSiteById } from "@/domain/screening-sites";
import type { ReferralDestination, Referral, ScreeningGap, ScreeningResult } from "@/domain/types";
import { tScreening, type Language } from "@/i18n/strings";

// The printable referral packet: everything the receiving clinic needs to see,
// watermarked DEMO and honest about what a production packet would add.
export function ReferralPacketView({
  patientName,
  result,
  referral,
  destination,
  gap,
  language
}: {
  patientName: string;
  result: ScreeningResult;
  referral: Referral;
  destination: ReferralDestination;
  gap?: ScreeningGap;
  language: Language;
}) {
  const rows: Array<[string, string]> = [
    [tScreening(language, "packetPatient"), patientName],
    [
      tScreening(language, "packetResult"),
      tScreening(language, gradeStringKey({ grade: result.grade, dmePresent: result.dmePresent, ungradable: result.outcome === "ungradable" }))
    ],
    [
      tScreening(language, "packetUrgency"),
      tScreening(language, referral.tier === "retina_urgent" ? "packetUrgencyUrgent" : "packetUrgencyRoutine")
    ],
    [tScreening(language, "packetDestination"), `${destination.name} — ${destination.city}, ${destination.phone}`],
    [
      tScreening(language, "packetScreenedAt"),
      `${gap?.scheduledSiteId ? getSiteById(gap.scheduledSiteId)?.name ?? "" : ""} ${new Date(result.confirmedAt).toLocaleDateString()}`.trim()
    ]
  ];

  return (
    <section className="relative overflow-hidden rounded-control border border-ink/20 bg-white p-4 print:border-0">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-bold uppercase tracking-widest text-pulse/20"
        style={{ transform: "rotate(-24deg)" }}
      >
        {tScreening(language, "packetWatermark")}
      </p>
      <h3 className="text-lg font-semibold">{tScreening(language, "packetTitle")}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7rem,1fr] gap-2 text-sm leading-6">
            <dt className="font-medium text-ink/60">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-5 text-ink/60">{tScreening(language, "packetFootnote")}</p>
      <button
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-control border border-care px-4 py-2 text-sm font-semibold text-care print:hidden"
        onClick={() => window.print()}
        type="button"
      >
        <Printer aria-hidden="true" className="h-4 w-4" />
        {tScreening(language, "packetPrint")}
      </button>
    </section>
  );
}
