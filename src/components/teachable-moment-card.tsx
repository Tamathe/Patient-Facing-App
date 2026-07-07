"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Camera, Droplet, GraduationCap, Pill, Sparkles } from "lucide-react";
import { tScreening, type Language } from "@/i18n/strings";

// The teachable moment: the eye result becomes daily-diabetes motivation, with
// one fixed bridge line and CTAs into surfaces that already exist.
export function TeachableMomentCard({ language }: { language: Language }) {
  const ctas = [
    { href: "/glucose", label: tScreening(language, "teachCtaGlucose"), icon: Droplet },
    { href: "/food", label: tScreening(language, "teachCtaFood"), icon: Camera },
    { href: "/medicines", label: tScreening(language, "teachCtaMeds"), icon: Pill }
  ];

  return (
    <section className="rounded-control border border-care/30 bg-calm p-4">
      <p className="flex items-start gap-2 text-sm font-medium leading-6 text-ink">
        <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-care" />
        {tScreening(language, "teachBridge")}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {ctas.map((cta) => {
          const Icon = cta.icon;
          return (
            <Link
              key={cta.href}
              className="flex min-h-12 items-center justify-center gap-2 rounded-control border border-care bg-white px-3 py-2 text-sm font-semibold text-care hover:bg-calm"
              href={cta.href}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {cta.label}
            </Link>
          );
        })}
      </div>
      <Link
        className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-control border border-care/40 bg-white px-3 py-2 text-sm font-semibold text-care hover:bg-calm"
        href="/learn/retinopathy"
      >
        <GraduationCap aria-hidden="true" className="h-4 w-4" />
        {language === "es" ? "Aprende sobre la retinopatía diabética" : "Learn about diabetic retinopathy"}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}
