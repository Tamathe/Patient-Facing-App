"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch
} from "react";
import { FamilyFactCard } from "@/components/family-fact-card";
import {
  FamilyInterview,
  type FamilyInterviewSubmissionMeta,
  type SanitizedFamilyInterviewResult
} from "@/components/family-interview";
import { FamilyNeedsScreen } from "@/components/family-needs-screen";
import { FamilyProfileForm } from "@/components/family-profile-form";
import { FamilyResourceCard } from "@/components/family-resource-card";
import { FamilyStageTimeline } from "@/components/family-stage-timeline";
import { recordAuditEvent } from "@/domain/audit";
import { familyFactStatus } from "@/domain/family-interview";
import {
  childAgeYears,
  findFamilyResources,
  getFamilyResourceById,
  type FamilyResource
} from "@/domain/family-resources";
import type {
  AppState,
  DevNeedDomain,
  FamilyFact,
  FamilyProfile,
  FamilyScreenAnswer
} from "@/domain/types";
import { tFamily, type FamilyStringKey } from "@/i18n/family-strings";
import type { HealthAction } from "@/state/store";

export type FamilyExperienceProps = {
  state: AppState;
  dispatch: Dispatch<HealthAction>;
  passcode?: string;
};

type MatchedResource = {
  resource: FamilyResource;
  domain: DevNeedDomain;
  position: number;
};

type ReviewDetails = {
  domains: SanitizedFamilyInterviewResult["domains"];
  followUps: string[];
};

const DOMAIN_KEYS: Record<DevNeedDomain, FamilyStringKey> = {
  early_intervention: "domainEarlyIntervention",
  therapies: "domainTherapies",
  school_iep: "domainSchoolIep",
  waivers_financial: "domainWaiversFinancial",
  respite: "domainRespite",
  parent_support: "domainParentSupport",
  sibling_support: "domainSiblingSupport",
  transportation: "domainTransportation",
  future_planning: "domainFuturePlanning",
  diagnosis_education: "domainDiagnosisEducation",
  recreation: "domainRecreation"
};

const FALLBACK_IDS = ["ky_spin", "hdi_resource_guide", "kynect_resources", "kentucky_211"] as const;
const FALLBACK_ID_SET = new Set<string>(FALLBACK_IDS);

function buildResourceMatches(
  profile: FamilyProfile,
  domains: DevNeedDomain[],
  alreadyEnrolled: string[]
): { resources: MatchedResource[]; isFallback: boolean } {
  if (domains.length === 0) {
    return { resources: [], isFallback: false };
  }

  const seen = new Set<string>();
  const matches: MatchedResource[] = [];
  for (const domain of domains) {
    const resources = findFamilyResources({
      county: profile.county,
      domain,
      childAgeYears: childAgeYears(profile),
      limit: 4
    });
    for (const resource of resources) {
      if (seen.has(resource.id)) continue;
      seen.add(resource.id);
      matches.push({ resource, domain, position: matches.length });
    }
  }

  const hasDomainSpecificMatch = matches.some(({ resource }) => !FALLBACK_ID_SET.has(resource.id));
  if (!hasDomainSpecificMatch) {
    const domain = domains[0];
    return {
      isFallback: true,
      resources: FALLBACK_IDS.flatMap((id, position) => {
        const resource = getFamilyResourceById(id);
        return resource ? [{ resource, domain, position }] : [];
      })
    };
  }

  const enrolled = new Set(alreadyEnrolled);
  return {
    isFallback: false,
    resources: [...matches].sort(
      (left, right) =>
        Number(enrolled.has(left.resource.id)) - Number(enrolled.has(right.resource.id)) ||
        left.position - right.position
    )
  };
}

export function FamilyExperience({ state, dispatch, passcode }: FamilyExperienceProps) {
  const language = state.patient.language;
  const family = state.family;
  const [reviewDetails, setReviewDetails] = useState<ReviewDetails | null>(null);
  const [safetySuppressed, setSafetySuppressed] = useState(false);
  const [seedVersion, setSeedVersion] = useState(0);
  const reviewRef = useRef<HTMLElement>(null);
  const latestInterview = family?.interviews.at(-1);
  const latestInterviewId = latestInterview?.id;
  const reviewFacts = family?.facts.filter(({ interviewId }) => interviewId === latestInterviewId) ?? [];

  useEffect(() => {
    if (latestInterviewId && !safetySuppressed) {
      reviewRef.current?.focus();
    }
  }, [latestInterviewId, safetySuppressed]);

  const matchResult = useMemo(() => {
    if (!family?.profile || safetySuppressed) {
      return { resources: [], isFallback: false };
    }
    return buildResourceMatches(family.profile, family.activeDomains, family.alreadyEnrolled);
  }, [family?.activeDomains, family?.alreadyEnrolled, family?.profile, safetySuppressed]);

  const savedResources = useMemo(
    () =>
      family?.saved.flatMap((saved) => {
        const resource = getFamilyResourceById(saved.resourceId);
        return resource ? [{ resource, domain: saved.domain }] : [];
      }) ?? [],
    [family?.saved]
  );

  function seedExample(example: "morgan" | "casey"): void {
    setReviewDetails(null);
    setSafetySuppressed(false);
    setSeedVersion((current) => current + 1);
    dispatch({ type: "seedExampleFamily", example });
  }

  function saveProfile(profile: FamilyProfile): void {
    setSafetySuppressed(false);
    dispatch({ type: "saveFamilyProfile", profile });
  }

  function submitScreen(answers: FamilyScreenAnswer[], facts: FamilyFact[]): void {
    setSafetySuppressed(false);
    dispatch({ type: "submitFamilyScreen", answers, facts });
  }

  function addInterview(
    result: SanitizedFamilyInterviewResult,
    meta: FamilyInterviewSubmissionMeta
  ): void {
    const interviewId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const facts: FamilyFact[] = result.facts.map((fact) => ({
      id: crypto.randomUUID(),
      interviewId,
      label: fact.label,
      value: fact.value,
      status: familyFactStatus(fact.sourceSnippet, meta.rawText),
      sourceSnippet: fact.sourceSnippet
    }));
    const domains = result.domains.map(({ domain }) => domain);
    const visibleDomains =
      language === "es" && meta.extraction === "mock"
        ? result.domains.map(({ domain }) => ({ domain }))
        : result.domains;

    setSafetySuppressed(false);
    setReviewDetails({ domains: visibleDomains, followUps: result.followUps });
    dispatch({
      type: "addFamilyInterview",
      interview: {
        id: interviewId,
        rawText: meta.rawText,
        source: meta.source,
        createdAt,
        extraction: meta.extraction
      },
      facts,
      domains
    });
  }

  function saveResource(resource: FamilyResource, domain: DevNeedDomain): void {
    dispatch({
      type: "saveFamilyResource",
      resource: { resourceId: resource.id, savedAt: new Date().toISOString(), domain }
    });
  }

  function shareResource(resource: FamilyResource): void {
    dispatch({
      type: "addAuditEvent",
      event: recordAuditEvent(state.patient.id, "shared", `Shared family resource: ${resource.name}`)
    });
  }

  function suppressForSafety(): void {
    setReviewDetails(null);
    setSafetySuppressed(true);
  }

  return (
    <div lang={language} data-testid="family-experience" className="grid min-w-0 gap-5 pb-8">
      <section className="rounded-control border border-care/20 bg-white p-4">
        <p className="inline-flex rounded-full bg-calm px-3 py-1 text-xs font-semibold text-care">
          {tFamily(language, "demoBadge")}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink/75">{tFamily(language, "intro")}</p>
        {language === "es" ? (
          <p className="mt-3 rounded-control bg-note p-3 text-sm font-medium">
            {tFamily(language, "spanishReviewNotice")}
          </p>
        ) : null}
      </section>

      <FamilyProfileForm
        key={`family-profile-${seedVersion}`}
        language={language}
        initialProfile={family?.profile ?? null}
        defaultCounty={state.patient.county}
        onSave={saveProfile}
        onSeedExample={seedExample}
      />

      {family?.profile ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2" aria-label={tFamily(language, "pageTitle")}>
            <a
              href="#family-screen-title"
              className="min-w-0 rounded-control border border-care/20 bg-white p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
            >
              <h2 className="break-words text-lg font-semibold">{tFamily(language, "entryQuestionsTitle")}</h2>
              <p className="mt-1 break-words text-sm leading-6 text-ink/75">
                {tFamily(language, "entryQuestionsBody")}
              </p>
            </a>
            <a
              href="#family-interview-title"
              className="min-w-0 rounded-control border border-care/20 bg-white p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
            >
              <h2 className="break-words text-lg font-semibold">{tFamily(language, "entryInterviewTitle")}</h2>
              <p className="mt-1 break-words text-sm leading-6 text-ink/75">
                {tFamily(language, "entryInterviewBody")}
              </p>
            </a>
          </section>

          <FamilyNeedsScreen
            key={`family-screen-${seedVersion}`}
            language={language}
            initialAnswers={family.screenAnswers}
            onSubmit={submitScreen}
          />

          <section className="rounded-control border border-care/20 bg-white p-4" aria-labelledby="family-interview-title">
            <h2 id="family-interview-title" className="text-xl font-semibold">
              {tFamily(language, "interviewTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/75">{tFamily(language, "interviewIntro")}</p>
            <div className="mt-4">
              <FamilyInterview
                profile={family.profile}
                draft={family.interviewDraft}
                passcode={passcode}
                language={language}
                onDraftChange={(draft) => dispatch({ type: "setFamilyInterviewDraft", draft })}
                onExtracted={addInterview}
                onSafetyEscalation={suppressForSafety}
              />
            </div>
          </section>

          {!safetySuppressed && (reviewFacts.length > 0 || reviewDetails) ? (
            <section
              ref={reviewRef}
              tabIndex={-1}
              aria-live="polite"
              aria-labelledby="family-facts-title"
              className="grid gap-3 rounded-control border border-care/20 bg-paper p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
            >
              <h2 id="family-facts-title" className="text-xl font-semibold">
                {tFamily(language, "factsTitle")}
              </h2>
              <p className="text-sm leading-6 text-ink/75">{tFamily(language, "factsIntro")}</p>
              {reviewFacts.map((fact) => (
                <FamilyFactCard
                  key={fact.id}
                  fact={fact}
                  language={language}
                  onConfirm={(factId) => dispatch({ type: "confirmFamilyFact", factId })}
                />
              ))}
              {reviewDetails?.domains.length ? (
                <div>
                  <h3 className="font-semibold">{tFamily(language, "domainRationaleTitle")}</h3>
                  <ul className="mt-2 grid gap-2">
                    {reviewDetails.domains.map(({ domain, rationale }) => (
                      <li key={domain} className="rounded-control bg-white p-3 text-sm">
                        <span className="font-semibold">{tFamily(language, DOMAIN_KEYS[domain])}</span>
                        {rationale ? <p className="mt-1 break-words text-ink/75">{rationale}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {reviewDetails?.followUps.length ? (
                <div>
                  <h3 className="font-semibold">{tFamily(language, "followUpsTitle")}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/75">
                    {reviewDetails.followUps.map((followUp) => (
                      <li key={followUp} className="break-words">
                        {followUp}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {!safetySuppressed && family.activeDomains.length > 0 ? (
            <section className="rounded-control border border-care/20 bg-paper p-4" aria-labelledby="family-resources-title">
              <h2 id="family-resources-title" className="text-xl font-semibold">
                {tFamily(language, "resourcesTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink/75">{tFamily(language, "resourcesIntro")}</p>
              {matchResult.isFallback ? (
                <section
                  aria-label={tFamily(language, "emptyFallbackTitle")}
                  className="mt-4 rounded-control border border-note bg-note/20 p-3"
                >
                  <h3 className="font-semibold">{tFamily(language, "emptyFallbackTitle")}</h3>
                  <p className="mt-1 text-sm leading-6">{tFamily(language, "emptyFallbackBody")}</p>
                  <p className="mt-1 text-sm leading-6">{tFamily(language, "emptyNavigatorHonesty")}</p>
                  <div data-testid="matched-family-resources" className="mt-4 grid gap-3">
                    {matchResult.resources.map(({ resource, domain }) => (
                      <FamilyResourceCard
                        key={`fallback-${resource.id}`}
                        resource={resource}
                        domain={domain}
                        language={language}
                        isSaved={family.saved.some(({ resourceId }) => resourceId === resource.id)}
                        isEnrolled={family.alreadyEnrolled.includes(resource.id)}
                        onSave={saveResource}
                        onShare={shareResource}
                        onToggleEnrollment={(resourceId) =>
                          dispatch({ type: "toggleFamilyEnrollment", resourceId })
                        }
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <div data-testid="matched-family-resources" className="mt-4 grid gap-3">
                  {matchResult.resources.map(({ resource, domain }) => (
                    <FamilyResourceCard
                      key={`matched-${resource.id}`}
                      resource={resource}
                      domain={domain}
                      language={language}
                      isSaved={family.saved.some(({ resourceId }) => resourceId === resource.id)}
                      isEnrolled={family.alreadyEnrolled.includes(resource.id)}
                      onSave={saveResource}
                      onShare={shareResource}
                      onToggleEnrollment={(resourceId) =>
                        dispatch({ type: "toggleFamilyEnrollment", resourceId })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section
            role="region"
            aria-label={tFamily(language, "savedResourcesTitle")}
            className="rounded-control border border-care/20 bg-paper p-4"
          >
            <h2 className="text-xl font-semibold">{tFamily(language, "savedResourcesTitle")}</h2>
            {savedResources.length === 0 ? (
              <p className="mt-2 text-sm text-ink/70">{tFamily(language, "savedResourcesEmpty")}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {savedResources.map(({ resource, domain }) => (
                  <FamilyResourceCard
                    key={`saved-${resource.id}`}
                    resource={resource}
                    domain={domain}
                    language={language}
                    isSaved
                    isEnrolled={family.alreadyEnrolled.includes(resource.id)}
                    onSave={saveResource}
                    onShare={shareResource}
                    onToggleEnrollment={(resourceId) =>
                      dispatch({ type: "toggleFamilyEnrollment", resourceId })
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <FamilyStageTimeline family={family} language={language} />
        </>
      ) : null}
    </div>
  );
}
