import Link from "next/link";
import React from "react";
import { AUDIT_C_PRIVACY, AUDIT_C_WITHDRAWAL_WARNING } from "@/domain/instruments/audit-c";
import type { Language } from "@/i18n/strings";

type CardCopy = {
  title: string;
  body: string;
  note?: string;
  urgent?: boolean;
  link?: { href: string; label: string };
};

function outcomeCopy(
  instrumentId: string,
  band: string,
  responses: readonly number[],
  language: Language
): CardCopy | null {
  if (instrumentId === "lung_ldct_eligibility" && band === "eligible") {
    return language === "es"
      ? {
          title: "Próximo paso",
          body: "Se recomienda una tomografía computarizada de dosis baja cada año para personas como usted. Por lo general está cubierta sin costo — pida a su clínica que lo confirme y la programe."
        }
      : {
          title: "Next step",
          body: "A yearly low-dose CT scan is recommended for people like you. It's usually covered at no cost — ask your clinic to check and set it up."
        };
  }
  if (instrumentId === "lung_ldct_eligibility" && band === "see_clinician_now") {
    return language === "es"
      ? { title: "Comuníquese con su clínica ahora", body: "Comuníquese con su clínica ahora por los síntomas que informó. Necesita una evaluación clínica, no programar una detección rutinaria.", urgent: true }
      : { title: "Contact your clinic now", body: "Contact your clinic now about the symptoms you reported. This needs clinical evaluation, not routine screening scheduling.", urgent: true };
  }
  if (instrumentId === "crc_eligibility" && band === "see_clinician_now") {
    return language === "es"
      ? { title: "Comuníquese con su clínica ahora", body: "Comuníquese con su clínica ahora por la respuesta sobre síntomas o antecedentes familiares. Necesita orientación clínica, no una vía de detección rutinaria.", urgent: true }
      : { title: "Contact your clinic now", body: "Contact your clinic now about the symptom or family-history answer. This needs clinical guidance, not a routine screening pathway.", urgent: true };
  }
  if (instrumentId === "crc_eligibility" && band === "due") {
    return language === "es"
      ? { title: "Converse sobre la detección", body: "Pregunte a su profesional clínico qué opción de detección colorrectal es adecuada para usted." }
      : { title: "Discuss screening", body: "Ask your clinician which colorectal screening option fits you." };
  }
  if (instrumentId === "crc_eligibility" && band === "not_due" && responses[3] === 1) {
    return language === "es"
      ? { title: "Informe la prueba que se hizo", body: "Es posible que ya esté al día — dígale a su profesional clínico qué prueba se hizo." }
      : { title: "Share what you had", body: "You may already be up to date — tell your clinician what you've had." };
  }
  if (instrumentId === "prediabetes_risk" && band === "high_risk") {
    return language === "es"
      ? { title: "Pregunte por prevención", body: "Pregunte por un análisis de sangre y una remisión al Programa Nacional de Prevención de la Diabetes (NDPP)." }
      : { title: "Ask about prevention", body: "Ask about a blood test and a referral to the National Diabetes Prevention Program (NDPP)." };
  }
  if (instrumentId === "audit_c" && band === "high_risk") {
    return {
      title: language === "es" ? "Primero haga un plan seguro" : "Make a safe plan first",
      body: AUDIT_C_WITHDRAWAL_WARNING[language],
      note: AUDIT_C_PRIVACY[language]
    };
  }
  if (instrumentId === "dds2" && band === "elevated_distress") {
    return language === "es"
      ? { title: "Apoyo para la diabetes", body: "Pida apoyo práctico a un educador en diabetes o a su equipo de atención de diabetes. Este resultado trata de la angustia por diabetes, no es un diagnóstico de depresión." }
      : { title: "Diabetes support", body: "Ask a diabetes educator or diabetes care team for practical support. This result is about diabetes distress, not a depression diagnosis." };
  }
  if (instrumentId === "steadi3" && band === "at_risk") {
    return language === "es"
      ? { title: "Prevención de caídas", body: "Pida una revisión de medicamentos y considere un chequeo de la vista.", link: { href: "/screening", label: "Chequeo de la vista" } }
      : { title: "Falls prevention", body: "Ask for a medication review and consider vision screening.", link: { href: "/screening", label: "Vision screening" } };
  }
  if (instrumentId === "steadi3" && band === "fall_with_injury") {
    return language === "es"
      ? { title: "Comuníquese con su clínica ahora", body: "Comuníquese con su clínica ahora por la caída y la lesión que informó.", urgent: true }
      : { title: "Contact your clinic now", body: "Contact your clinic now about the fall and injury you reported.", urgent: true };
  }
  return null;
}

export function AdultOutcomeCard({
  instrumentId,
  band,
  responses,
  language
}: {
  instrumentId: string;
  band: string;
  responses: readonly number[];
  language: Language;
}) {
  const copy = outcomeCopy(instrumentId, band, responses, language);
  if (!copy) {
    return null;
  }
  return (
    <aside className={`mt-4 rounded-control border p-4 ${copy.urgent ? "border-rose-400 bg-rose-50" : "border-care/20 bg-calm"}`}>
      <h3 className="font-semibold">{copy.title}</h3>
      <p className="mt-2 text-sm leading-6">{copy.body}</p>
      {copy.note ? <p className="mt-2 text-sm leading-6 font-medium">{copy.note}</p> : null}
      {copy.link ? (
        <Link className="mt-3 inline-flex font-semibold text-care underline" href={copy.link.href}>
          {copy.link.label}
        </Link>
      ) : null}
    </aside>
  );
}
