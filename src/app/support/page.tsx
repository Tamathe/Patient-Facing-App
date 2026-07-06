"use client";

import React, { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ResourceReferral } from "@/components/resource-referral";
import { recordAuditEvent } from "@/domain/audit";
import { findKentuckyResources, type KentuckySdohResource } from "@/domain/sdoh-resources";
import {
  SOCIAL_SCREEN_QUESTIONS,
  buildSocialScreenRecord,
  computeSocialFlags,
  socialDomainToNeedType,
  suggestZCodes,
  type SocialAnswer,
  type SocialResponse
} from "@/domain/social-screen";
import { useHealthState } from "@/state/store";

const RESPONSE_CHOICES: SocialResponse[] = ["yes", "no", "declined"];

export default function SupportPage() {
  const { state, dispatch } = useHealthState();
  const language = state.patient.language;
  const [responses, setResponses] = useState<Record<string, SocialResponse>>({});
  const [submitted, setSubmitted] = useState(false);
  const [countyInput, setCountyInput] = useState(state.patient.county ?? "");

  const answers: SocialAnswer[] = useMemo(
    () =>
      SOCIAL_SCREEN_QUESTIONS.filter((question) => responses[question.id] !== undefined).map((question) => ({
        questionId: question.id,
        domain: question.domain,
        response: responses[question.id]
      })),
    [responses]
  );

  const flags = useMemo(() => computeSocialFlags(answers), [answers]);
  const county = state.patient.county ?? countyInput;
  const zCodes = useMemo(() => suggestZCodes(flags), [flags]);

  const matchedByNeed = useMemo(() => {
    if (county.trim().length === 0) {
      return [] as Array<{ need: string; resources: KentuckySdohResource[] }>;
    }
    return flags.map((domain) => ({
      need: domain,
      resources: findKentuckyResources({ county, needType: socialDomainToNeedType(domain) })
    }));
  }, [flags, county]);

  function submitScreen() {
    const record = buildSocialScreenRecord(answers, state.patient.id, new Date().toISOString(), language);
    dispatch({ type: "addContextItem", item: record.item, facts: record.facts });
    setSubmitted(true);
  }

  function shareReferral(resource: KentuckySdohResource) {
    dispatch({
      type: "addAuditEvent",
      event: recordAuditEvent(state.patient.id, "shared", `Shared referral: ${resource.name}`)
    });
  }

  const label = (choice: SocialResponse) =>
    language === "es"
      ? choice === "yes"
        ? "Sí"
        : choice === "no"
          ? "No"
          : "Prefiero no responder"
      : choice === "yes"
        ? "Yes"
        : choice === "no"
          ? "No"
          : "Prefer not to answer";

  return (
    <AppShell title={language === "es" ? "Apoyo" : "Support"}>
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">
            {language === "es" ? "Un chequeo rápido de necesidades" : "A quick needs check-in"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            {language === "es"
              ? "Estas preguntas son opcionales. Tus respuestas se quedan en este dispositivo hasta que decidas compartir algo."
              : "These questions are optional. Your answers stay on this device until you choose to share something."}
          </p>
        </section>

        {!submitted ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitScreen();
            }}
          >
            {SOCIAL_SCREEN_QUESTIONS.map((question) => (
              <fieldset key={question.id} className="grid gap-2 rounded-control border border-ink/10 bg-white p-4">
                <legend className="text-sm font-medium">{question[language]}</legend>
                <div className="flex flex-wrap gap-2">
                  {RESPONSE_CHOICES.map((choice) => (
                    <label key={choice} className="inline-flex min-h-12 items-center gap-2 rounded-control border border-ink/15 px-3 py-2 text-sm">
                      <input
                        checked={responses[question.id] === choice}
                        name={question.id}
                        onChange={() => setResponses((current) => ({ ...current, [question.id]: choice }))}
                        type="radio"
                        value={choice}
                      />
                      {label(choice)}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              className="inline-flex min-h-12 w-fit items-center rounded-control bg-care px-4 py-2 font-semibold text-white"
              type="submit"
            >
              {language === "es" ? "Ver apoyos" : "See support"}
            </button>
          </form>
        ) : (
          <div className="grid gap-5">
            {state.patient.county === undefined ? (
              <label className="grid gap-1 text-sm font-medium">
                {language === "es" ? "Tu condado (Kentucky)" : "Your county (Kentucky)"}
                <input
                  className="min-h-12 rounded-control border border-ink/20 px-3 py-2"
                  onChange={(event) => setCountyInput(event.target.value)}
                  placeholder={language === "es" ? "por ejemplo, Perry" : "e.g. Perry"}
                  value={countyInput}
                />
              </label>
            ) : null}

            {flags.length === 0 ? (
              <section className="rounded-control border border-ink/10 bg-white p-4">
                <p className="text-sm leading-6 text-ink/80">
                  {language === "es"
                    ? "No marcaste ninguna necesidad hoy. Si algo cambia, puedes volver aquí, o llamar al 211 en cualquier momento."
                    : "You did not flag any needs today. If anything changes you can come back here, or dial 211 any time."}
                </p>
              </section>
            ) : county.trim().length === 0 ? (
              <p className="text-sm text-ink/75">
                {language === "es" ? "Ingresa tu condado para ver apoyos locales." : "Enter your county to see local support."}
              </p>
            ) : (
              matchedByNeed.map(({ need, resources }) => (
                <section key={need} className="grid gap-3">
                  <h3 className="text-lg font-semibold capitalize">{need}</h3>
                  {resources.length === 0 ? (
                    <p className="text-sm text-ink/75">
                      {language === "es"
                        ? "No encontramos un recurso local exacto. Llama al 211 para ayuda."
                        : "We did not find an exact local match. Dial 211 for help."}
                    </p>
                  ) : (
                    resources.map((resource) => (
                      <ResourceReferral key={resource.id} resource={resource} language={language} onShare={shareReferral} />
                    ))
                  )}
                </section>
              ))
            )}

            {zCodes.length > 0 ? (
              <section className="rounded-control border border-ink/10 bg-calm p-4">
                <h3 className="text-sm font-semibold">
                  {language === "es" ? "Para tu próxima visita" : "For your next visit"}
                </h3>
                <p className="mt-1 text-xs text-ink/70">
                  {language === "es"
                    ? "Sugerencias para revisar con tu equipo — no aplicadas automáticamente."
                    : "Suggestions to review with your care team — not applied automatically."}
                </p>
                <ul className="mt-2 grid gap-1 text-sm">
                  {zCodes.map((zCode) => (
                    <li key={zCode.code}>
                      <strong>{zCode.code}</strong> — {zCode.description} ({zCode.status})
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
