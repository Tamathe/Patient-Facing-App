import React from "react";
import { findFamilyResources } from "@/domain/family-resources";
import type { Language } from "@/i18n/strings";

const COPY = {
  en: {
    firstStepsAction: "Contact this point of entry soon. This is important follow-up, not emergency care.",
    contact: "How to start",
    call: "Call",
    or: "or",
    source: "Official source",
    pscTitle: "Bring these results to your child's pediatrician",
    pscBody: "The score can guide a conversation about what you are seeing. It does not diagnose a condition or choose a treatment."
  },
  es: {
    firstStepsAction: "Contacta pronto este punto de entrada. Este es un seguimiento importante, no atención de emergencia.",
    contact: "Cómo comenzar",
    call: "Llama al",
    or: "o",
    source: "Fuente oficial",
    pscTitle: "Lleva estos resultados al pediatra de tu hijo o hija",
    pscBody: "El puntaje puede orientar una conversación sobre lo que observas. No diagnostica una condición ni elige un tratamiento."
  }
} satisfies Record<Language, Record<string, string>>;

function localizedContact(contact: string, language: Language): string {
  const copy = COPY[language];
  const details = contact.replace(/^Call\s+/i, "").replace(/\s+or\s+/gi, ` ${copy.or} `);
  return `${copy.call} ${details}`;
}

type FamilyScreeningResultProps =
  | { kind: "psc17"; language: Language; county?: never; childAgeMonths?: never }
  | { kind: "first_steps"; language: Language; county: string; childAgeMonths: number };

export function FamilyScreeningResult(props: FamilyScreeningResultProps) {
  const copy = COPY[props.language];
  if (props.kind === "psc17") {
    return (
      <aside className="rounded-control border border-care/30 bg-calm p-4">
        <h3 className="font-semibold">{copy.pscTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-ink/80">{copy.pscBody}</p>
      </aside>
    );
  }

  const resources = findFamilyResources({
    county: props.county,
    domain: "early_intervention",
    childAgeYears: props.childAgeMonths / 12,
    limit: 2
  });
  if (resources.length === 0) {
    return null;
  }

  return (
    <aside className="rounded-control border border-care/30 bg-calm p-4">
      <p className="text-sm leading-6 text-ink/80">{copy.firstStepsAction}</p>
      <div className="mt-3 grid gap-4">
        {resources.map((resource) => (
          <article key={resource.id} className="rounded-control border border-care/20 bg-white p-3">
            <h3 className="font-semibold">{resource.name}</h3>
            <p className="mt-2 text-sm">
              <span className="font-semibold">{copy.contact}: </span>
              {localizedContact(resource.contact, props.language)}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-semibold">{copy.source}: </span>
              <a
                className="inline-flex min-h-11 items-center font-semibold text-care underline"
                href={resource.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                {resource.sourceName}
              </a>
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}
