"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch
} from "react";
import { FamilyFactCard } from "@/components/family-fact-card";
import type { FamilyInterviewSubmissionMeta, SanitizedFamilyInterviewResult } from "@/components/family-interview";
import { FamilyNeedsScreen } from "@/components/family-needs-screen";
import {
  EMPTY_FAMILY_INTERVIEW_PROFILE,
  FamilyOrientationInterview
} from "@/components/family-orientation-interview";
import { FamilyProfileForm } from "@/components/family-profile-form";
import { FamilyResourceCard } from "@/components/family-resource-card";
import { FamilyStageTimeline } from "@/components/family-stage-timeline";
import { recordAuditEvent } from "@/domain/audit";
import type { FamilyDiagnosisBackdateMonths } from "@/domain/family-stages";
import { familyFactStatus } from "@/domain/family-interview";
import {
  FAMILY_RESOURCE_CATALOG,
  KY_COUNTIES,
  childAgeYears,
  findFamilyResources,
  getFamilyResourceById,
  type FamilyResource
} from "@/domain/family-resources";
import type { Language } from "@/i18n/strings";
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
const CONTROL_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care";
const FALLBACK_ID_SET = new Set<string>(FALLBACK_IDS);
const normalizeCounty = (county: string): string => county.trim().replace(/\s+County$/i, "");

function prioritizeDomainCandidates(
  resources: FamilyResource[],
  county: string
): FamilyResource[] {
  const normalizedCounty = normalizeCounty(county);
  return resources
    .map((resource, catalogPosition) => ({ resource, catalogPosition }))
    .sort(
      (left, right) =>
        Number(!left.resource.counties.includes(normalizedCounty)) -
          Number(!right.resource.counties.includes(normalizedCounty)) ||
        Number(!left.resource.actNow) - Number(!right.resource.actNow) ||
        left.catalogPosition - right.catalogPosition
    )
    .map(({ resource }) => resource);
}

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
  const enrolled = new Set(alreadyEnrolled);
  for (const domain of domains) {
    const candidates = prioritizeDomainCandidates(
      findFamilyResources({
        county: profile.county,
        domain,
        childAgeYears: childAgeYears(profile),
        limit: FAMILY_RESOURCE_CATALOG.length
      }).filter(({ id }) => !seen.has(id)),
      profile.county
    );
    const selected = [
      ...candidates.filter(({ id }) => !enrolled.has(id)).slice(0, 4),
      ...candidates.filter(({ id }) => enrolled.has(id))
    ];
    for (const resource of selected) {
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

  return {
    isFallback: false,
    resources: [...matches].sort(
      (left, right) =>
        Number(enrolled.has(left.resource.id)) - Number(enrolled.has(right.resource.id)) ||
        left.position - right.position
    )
  };
}

function buildNearbyTherapeuticRecreation(
  profile: FamilyProfile,
  primaryResourceIds: Set<string>,
  alreadyEnrolled: string[]
): MatchedResource[] {
  const normalizedCounty = normalizeCounty(profile.county);
  const enrolled = new Set(alreadyEnrolled);
  return findFamilyResources({
    county: profile.county,
    domain: "recreation",
    childAgeYears: childAgeYears(profile),
    limit: FAMILY_RESOURCE_CATALOG.length
  })
    .filter(
      (resource) =>
        resource.counties.includes(normalizedCounty) &&
        resource.domains.includes("therapies") &&
        !primaryResourceIds.has(resource.id)
    )
    .map((resource, position) => ({ resource, domain: "recreation" as const, position }))
    .sort(
      (left, right) =>
        Number(enrolled.has(left.resource.id)) - Number(enrolled.has(right.resource.id)) ||
        left.position - right.position
    )
    .slice(0, 2);
}

const BASICS_SCHOOL_OPTIONS: ReadonlyArray<{ value: FamilyProfile["schoolStage"]; key: FamilyStringKey }> = [
  { value: "not_school_age", key: "schoolNotSchoolAge" },
  { value: "preschool", key: "schoolPreschool" },
  { value: "elementary", key: "schoolElementary" },
  { value: "middle", key: "schoolMiddle" },
  { value: "high", key: "schoolHigh" },
  { value: "post_high", key: "schoolPostHigh" }
];

type FamilyBasicsAnswers = Pick<FamilyProfile, "county" | "birthYear" | "schoolStage">;

// Conversational county → birth year → school stage turns, asked in the thread
// once the first description lands and no profile exists yet.
function FamilyBasicsTurns({
  language,
  onComplete
}: {
  language: Language;
  onComplete: (basics: FamilyBasicsAnswers) => void;
}) {
  const [county, setCounty] = useState("");
  const [committedCounty, setCommittedCounty] = useState<string | null>(null);
  const [year, setYear] = useState("");
  const [committedYear, setCommittedYear] = useState<number | null>(null);
  const [yearError, setYearError] = useState(false);

  const countyQuestion = tFamily(language, "basicsCountyQuestion");
  const yearQuestion = tFamily(language, "basicsYearQuestion");

  function commitYear(): void {
    const parsed = Number(year);
    const currentYear = new Date().getFullYear();
    if (!/^\d{4}$/.test(year) || parsed < 1900 || parsed > currentYear) {
      setYearError(true);
      return;
    }
    setCommittedYear(parsed);
  }

  return (
    <div className="space-y-3" data-testid="family-basics-turns">
      <div className="mr-auto max-w-[90%] rounded-control border border-ink/10 bg-white p-3">
        <p className="break-words font-semibold">{countyQuestion}</p>
        {committedCounty === null ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              aria-label={countyQuestion}
              value={county}
              onChange={(event) => setCounty(event.target.value)}
              className={`min-h-12 min-w-0 flex-1 rounded-control border border-ink/20 bg-white px-3 py-2 ${CONTROL_FOCUS}`}
            >
              <option value="">{tFamily(language, "profileCountyPlaceholder")}</option>
              {KY_COUNTIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={county.length === 0}
              onClick={() => setCommittedCounty(county)}
              className={`min-h-12 rounded-control bg-care px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CONTROL_FOCUS}`}
            >
              {tFamily(language, "basicsTurnNext")}
            </button>
          </div>
        ) : null}
      </div>

      {committedCounty !== null ? (
        <>
          <div className="ml-auto max-w-[90%] rounded-control bg-care/10 p-3">
            <p className="break-words">{committedCounty}</p>
          </div>
          <div className="mr-auto max-w-[90%] rounded-control border border-ink/10 bg-white p-3">
            <p className="break-words font-semibold">{yearQuestion}</p>
            {committedYear === null ? (
              <div className="mt-3 grid gap-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label={yearQuestion}
                    inputMode="numeric"
                    value={year}
                    aria-invalid={yearError}
                    placeholder={tFamily(language, "profileBirthYearPlaceholder")}
                    onChange={(event) => {
                      setYearError(false);
                      setYear(event.target.value);
                    }}
                    className={`min-h-12 min-w-0 flex-1 rounded-control border border-ink/20 px-3 py-2 ${CONTROL_FOCUS}`}
                  />
                  <button
                    type="button"
                    onClick={commitYear}
                    className={`min-h-12 rounded-control bg-care px-4 py-2 font-semibold text-white ${CONTROL_FOCUS}`}
                  >
                    {tFamily(language, "basicsTurnNext")}
                  </button>
                </div>
                {yearError ? (
                  <p role="alert" className="text-sm font-medium text-rose-700">
                    {tFamily(language, "profileBirthYearError")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {committedCounty !== null && committedYear !== null ? (
        <>
          <div className="ml-auto max-w-[90%] rounded-control bg-care/10 p-3">
            <p className="break-words">{committedYear}</p>
          </div>
          <div className="mr-auto max-w-[90%] rounded-control border border-ink/10 bg-white p-3">
            <p className="break-words font-semibold">{tFamily(language, "basicsStageQuestion")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BASICS_SCHOOL_OPTIONS.map(({ value, key }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onComplete({ county: committedCounty, birthYear: committedYear, schoolStage: value })
                  }
                  className={`min-h-12 min-w-0 break-words rounded-control border border-care/30 bg-care/5 px-4 py-2 text-left font-semibold text-care ${CONTROL_FOCUS}`}
                >
                  {tFamily(language, key)}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function FamilyExperience({ state, dispatch, passcode }: FamilyExperienceProps) {
  const language = state.patient.language;
  const family = state.family;
  const [reviewDetails, setReviewDetails] = useState<ReviewDetails | null>(null);
  const [safetySuppressed, setSafetySuppressed] = useState(false);
  const [needsScreenOpen, setNeedsScreenOpen] = useState(false);
  const [basicsToggled, setBasicsToggled] = useState<boolean | null>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const pendingReviewFocusRef = useRef(false);
  const latestInterview = family?.interviews.at(-1);
  const latestInterviewId = latestInterview?.id;
  const reviewFacts = family?.facts.filter(({ interviewId }) => interviewId === latestInterviewId) ?? [];
  const profileDiagnosisVersion =
    family?.profile?.diagnoses.map(({ id, diagnosedAt }) => `${id}:${diagnosedAt ?? ""}`).join("|") ?? "none";

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => {
      document.documentElement.lang = previousLanguage;
    };
  }, [language]);

  useEffect(() => {
    if (pendingReviewFocusRef.current && latestInterviewId && !safetySuppressed) {
      reviewRef.current?.focus();
      pendingReviewFocusRef.current = false;
    }
  }, [latestInterviewId, safetySuppressed]);

  const matchResult = useMemo(() => {
    if (!family?.profile || safetySuppressed) {
      return { resources: [], isFallback: false };
    }
    return buildResourceMatches(family.profile, family.activeDomains, family.alreadyEnrolled);
  }, [family?.activeDomains, family?.alreadyEnrolled, family?.profile, safetySuppressed]);

  const nearbyTherapeuticRecreation = useMemo(() => {
    if (!family?.profile || safetySuppressed || family.activeDomains.length === 0) {
      return [];
    }
    return buildNearbyTherapeuticRecreation(
      family.profile,
      new Set(matchResult.resources.map(({ resource }) => resource.id)),
      family.alreadyEnrolled
    );
  }, [family?.activeDomains, family?.alreadyEnrolled, family?.profile, matchResult.resources, safetySuppressed]);

  const savedResources = useMemo(
    () =>
      family?.saved.flatMap((saved) => {
        const resource = getFamilyResourceById(saved.resourceId);
        return resource ? [{ resource, domain: saved.domain }] : [];
      }) ?? [],
    [family?.saved]
  );

  function saveProfile(profile: FamilyProfile): void {
    setSafetySuppressed(false);
    dispatch({ type: "saveFamilyProfile", profile });
  }

  function backdateFamilyDiagnoses(monthsAgo: FamilyDiagnosisBackdateMonths, now: Date): void {
    dispatch({
      type: "backdateFamilyDiagnoses",
      monthsAgo,
      now: now.toISOString()
    });
  }

  function submitScreen(answers: FamilyScreenAnswer[], facts: FamilyFact[]): void {
    setSafetySuppressed(false);
    dispatch({ type: "submitFamilyScreen", answers, facts });
  }

  function addInterview(
    result: SanitizedFamilyInterviewResult,
    meta: FamilyInterviewSubmissionMeta,
    { round }: { round: number }
  ): void {
    pendingReviewFocusRef.current = round === 0;
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

    setSafetySuppressed(false);
    setReviewDetails({ domains: result.domains });
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
    pendingReviewFocusRef.current = false;
    setReviewDetails(null);
    setSafetySuppressed(true);
  }

  const basicsOpen = basicsToggled ?? false;
  const needsBasics =
    !safetySuppressed &&
    !!family &&
    !family.profile &&
    (family.interviews.length > 0 || family.activeDomains.length > 0);

  const reviewTurn =
    !safetySuppressed && (reviewFacts.length > 0 || reviewDetails) ? (
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
      </section>
    ) : null;

  const interlude =
    reviewTurn || needsBasics || matchResult.resources.length > 0 ? (
      <>
        {reviewTurn}
        {needsBasics ? (
          <FamilyBasicsTurns
            language={language}
            onComplete={({ county, birthYear, schoolStage }) =>
              saveProfile({
                county,
                birthYear,
                schoolStage,
                diagnoses: family?.profile?.diagnoses ?? []
              })
            }
          />
        ) : null}
        {matchResult.resources.length > 0 ? (
          <p className="mr-auto max-w-[90%] rounded-control border border-ink/10 bg-white p-3 font-medium">
            {tFamily(language, "resourcesFoundBelow", { count: matchResult.resources.length })}
          </p>
        ) : null}
      </>
    ) : null;

  return (
    <div lang={language} data-testid="family-experience" className="grid min-w-0 gap-5 pb-8">
      <section className="rounded-control border border-care/20 bg-white p-4" aria-labelledby="family-interview-title">
        <p className="inline-flex rounded-full bg-calm px-3 py-1 text-xs font-semibold text-care">
          {tFamily(language, "demoBadge")}
        </p>
        <h2 id="family-interview-title" tabIndex={-1} className="mt-3 text-2xl font-semibold">
          {tFamily(language, "interviewTitle")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink/75">{tFamily(language, "interviewIntro")}</p>
        <p className="mt-2 text-sm leading-6 text-ink/60">{tFamily(language, "intro")}</p>
        {language === "es" ? (
          <p className="mt-3 rounded-control bg-note p-3 text-sm font-medium">
            {tFamily(language, "spanishReviewNotice")}
          </p>
        ) : null}
        <div className="mt-4">
          <FamilyOrientationInterview
            key="family-orientation"
            profile={family?.profile ?? EMPTY_FAMILY_INTERVIEW_PROFILE}
            draft={family?.interviewDraft ?? ""}
            passcode={passcode}
            language={language}
            voiceEntryContext={{ patientId: state.patient.id, dispatch }}
            interlude={interlude}
            holdTurn={needsBasics}
            onDraftChange={(draft) => dispatch({ type: "setFamilyInterviewDraft", draft })}
            onInterviewExtracted={addInterview}
            onSafetyEscalation={suppressForSafety}
          />
        </div>
        <div className="mt-4 border-t border-care/10 pt-4">
          <button
            type="button"
            aria-expanded={needsScreenOpen}
            aria-controls="family-needs-screen-panel"
            onClick={() => setNeedsScreenOpen((current) => !current)}
            className={`min-h-12 w-full min-w-0 rounded-control text-left ${CONTROL_FOCUS}`}
          >
            <span className="block break-words font-semibold">
              {tFamily(language, "needsScreenDisclosureTitle")}
            </span>
            <span className="mt-1 block break-words text-sm leading-6 text-ink/75">
              {tFamily(language, "needsScreenDisclosureBody")}
            </span>
          </button>
          {needsScreenOpen ? (
            <div id="family-needs-screen-panel" className="mt-4">
              <FamilyNeedsScreen
                key="family-screen"
                language={language}
                initialAnswers={family?.screenAnswers ?? []}
                onSubmit={submitScreen}
              />
            </div>
          ) : null}
        </div>
      </section>

      {!safetySuppressed && family && family.profile && family.activeDomains.length > 0 ? (
            <section
              id="family-resources"
              className="rounded-control border border-care/20 bg-paper p-4"
              aria-labelledby="family-resources-title"
            >
              <h2 id="family-resources-title" className="text-xl font-semibold">
                {tFamily(language, "resourcesTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink/75">{tFamily(language, "resourcesIntro")}</p>
              {language === "es" ? (
                <p className="mt-2 rounded-control bg-note/30 p-3 text-sm leading-6 text-ink/75">
                  {tFamily(language, "resourceSourceLanguageNotice")}
                </p>
              ) : null}
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
              {nearbyTherapeuticRecreation.length > 0 ? (
                <section
                  role="region"
                  aria-label={tFamily(language, "nearbyTherapeuticRecreationTitle")}
                  className="mt-5 border-t border-care/20 pt-4"
                >
                  <h3 className="text-lg font-semibold">
                    {tFamily(language, "nearbyTherapeuticRecreationTitle")}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-ink/75">
                    {tFamily(language, "nearbyTherapeuticRecreationIntro")}
                  </p>
                  <div className="mt-3 grid gap-3">
                    {nearbyTherapeuticRecreation.map(({ resource, domain }) => (
                      <FamilyResourceCard
                        key={`nearby-recreation-${resource.id}`}
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
              ) : null}
            </section>
          ) : null}

      <section className="rounded-control border border-care/20 bg-white p-4">
        <button
          type="button"
          aria-expanded={basicsOpen}
          aria-controls="family-basics-panel"
          onClick={() => setBasicsToggled(!basicsOpen)}
          className={`min-h-12 w-full min-w-0 rounded-control text-left ${CONTROL_FOCUS}`}
        >
          <span className="block break-words text-lg font-semibold">
            {tFamily(language, "setupTitle")}
          </span>
          <span className="mt-1 block break-words text-sm leading-6 text-ink/75">
            {tFamily(language, "setupIntro")}
          </span>
        </button>
        {basicsOpen ? (
          <div id="family-basics-panel" className="mt-4">
            <FamilyProfileForm
              key={`family-profile-${profileDiagnosisVersion}`}
              language={language}
              initialProfile={family?.profile ?? null}
              defaultCounty={state.patient.county}
              onSave={saveProfile}
            />
          </div>
        ) : null}
      </section>

      {savedResources.length > 0 ? (
        <section
          role="region"
          aria-label={tFamily(language, "savedResourcesTitle")}
          className="rounded-control border border-care/20 bg-paper p-4"
        >
          <h2 className="text-xl font-semibold">{tFamily(language, "savedResourcesTitle")}</h2>
          <ul className="mt-4 grid gap-3">
            {savedResources.map(({ resource, domain }) => (
              <li
                key={`saved-${resource.id}`}
                data-testid="saved-family-resource-summary"
                className="rounded-control border border-ink/10 bg-white p-4"
              >
                <h3 className="break-words text-lg font-semibold">{resource.name}</h3>
                <p className="mt-1 text-sm text-ink/70">
                  {tFamily(language, DOMAIN_KEYS[domain])}
                </p>
                <a
                  href={resource.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${tFamily(language, "resourceOpenSource")}: ${resource.name}`}
                  className={`mt-3 inline-flex min-h-12 min-w-0 items-center rounded-control border border-care px-3 py-2 text-sm font-semibold text-care ${CONTROL_FOCUS}`}
                >
                  {tFamily(language, "resourceOpenSource")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {family?.profile ? (
        <FamilyStageTimeline
          family={family}
          language={language}
          nudgeFirstName={state.patient.preferredName}
          onBackdateDiagnoses={backdateFamilyDiagnoses}
        />
      ) : null}
    </div>
  );
}
