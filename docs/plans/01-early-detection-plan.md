# Implementation Plan — Silent-Killer Early Detection & Risk Stratification

**Spec:** `docs/specs/01-early-detection.md`
**Foundations:** `docs/plans/00-foundations.md` (reference, do not duplicate)

> Reviewer note: every symbol and line number below was verified against live source. Corrections vs. the draft are flagged inline as **[FIX]**.

**Foundations dependencies:**

- **F2 (`PatientProfile` demographics) — BLOCKING.** No cadence rule and no risk score computes without `dateOfBirth`/`sex`; fixtures are unscorable until this lands. P0 is impossible before F2. `isPatient()` (`storage.ts` 384–393) must change with it.
- **F10 (dataset registry) — BLOCKING for the shipped ADA rule.** The ADA/CDC risk points table + USPSTF diabetes-cadence rule ship as one versioned, cited registry entry (`name/version/effectiveDate/license/owner/citation`), not inline literals.
- **F5 (provenance + FDA posture) — BLOCKING at the patient-facing "recommending" surface only.** The risk-detail screen is the first surface showing a computed clinical number to a patient; it may not reach **real patients** before the `regulatory-posture-design-spec.md` legal hold clears. Local/fixture demo is *not* gated. `SourceCitation` (from F5) is what the score renders.
- **F4 (crisis gate / `task_e569880c`) — NOT a P0 dependency; BLOCKING for P1's depression path only.** P0 deliberately ships the ADA/diabetes path with **zero new safety-classifier surface**, so it does not touch `safety.ts` and does not depend on F4. FR-12 (PHQ + self-harm) is P1 and must consume F4's **as-built** `CRISIS_ACTIONS`/branch order — never the current `CARE_TEAM_ACTIONS` shape, never a hard-coded `["call_clinic","draft_message"]`.
- **F1 (backend) / F8 (return channel) — HELPFUL, deferred.** Needed only for the lagging clinical metrics (screening-completion, rejection-rate). P0 runs entirely on the localStorage reducer and reports leading indicators + self-reported proxies, clearly labeled.
- **F3 (audit actor) — HELPFUL, deferred.** P0 uses the existing anonymous `recordAuditEvent(patientId, action, label)`. Actor attribution is meaningless without a clinician actor (needs F1/F8). When F3 lands it defaults reducer callers to `system`, so P0 call sites don't rework.
- **F9 (i18n parity) — HELPFUL for EN; BLOCKING for Rosa's ES flow.** EN ships first. Land F9's parity-test generalization first so the new `earlyDetectionStrings` catalog is gated from its first commit; ES risk-explanation strings (FR-7) ship immediately after EN under that gate.

---

## 1. Objective & P0 Definition of Done

**Thin, shippable slice:** the **diabetes/prediabetes (ADA/CDC) path, end-to-end, local-first, one persona (Dolores), EN first.** A patient enters demographics + ≥1 family-history item + ≥1 manual lab (or none), the app **deterministically** computes an ADA/CDC risk score and a USPSTF diabetes-screening-cadence verdict, surfaces a ranked `kind: "screening"` card on Today that can never evict a priority-1 safety task, opens a risk-detail screen with a full evidence trail + honest-uncertainty note, lets the coach explain "why" in plain language through the existing safety gate, and drafts a care-team message — with **zero backend, zero network, and no new `safety.ts` surface**.

**P0 Definition of Done (acceptance):**

1. `PatientProfile` carries `dateOfBirth` + `sex` (+ optional `raceEthnicity`); `isPatient()` validates them; a `loadStoredState` migration back-fills legacy state instead of discarding it; the three existing fixtures (`demoState`, `deletedDemoState`, `brentState`) carry demographics **and** a new scorable **Dolores** fixture exists (see P0-4b). (FR-0)
2. A patient can add ≥1 structured first-degree family-history item (diabetes) stored `patient_reported`, and ≥1 manual lab (A1c or fasting glucose) stored `imported`/`patient_reported`, timestamped with the **result date** (not entry date), both removable. (FR-1, FR-2)
3. `computeAdaRisk(profile, inputs, asOf)` and `computeDiabetesCadence(profile, inputs, asOf)` are **pure, deterministic, unit-tested** functions in `src/domain/screening.ts`. Insufficient inputs → a `needs_review` result **naming the missing field**; **never a fabricated number**. (FR-3, FR-4)
4. A due/elevated result renders as a `kind: "screening"` `TaskItem` at **priority 2–3**, added **after** every safety/threshold/barrier/visit task, so the `MAX_TODAY_TASKS = 3` slice can only ever drop a screening card — proven by a regression test. (FR-5)
5. Every recommendation and every score input shows its `EvidenceStatus` badge via `evidenceStatusLabel()`; any score built on a `needs_review`/`inferred`/stale (>12 mo) input is visibly labeled provisional. (FR-6, FR-13)
6. The coach `why` mode explains the recommendation in plain language through `createSafeAiResponse()`, EN, **routing on new screening context (P0-15), not the medication-lookup fallback**. (FR-7)
7. "Ask my care team about this" produces a draft via an **extended** `buildCareTeamMessage(state, screening?)` that renders an evidence-labeled screening summary. Nothing is ordered or marked done; with no payload the output is byte-identical to today. (FR-8)
8. `buildHealthBrief()` includes a "Screening & Risk" section listing the due screen + score band + each input's evidence status, following the existing `{ title, items, status }` shape. (FR-9)
9. Every family-history entry, lab import, score computation, card surfaced, and care-team draft is recorded via `recordAuditEvent()`. (FR-11)
10. **[FIX] `npm run check` (`lint && test && build`) is green** — including the new deterministic-engine tests, the FR-5 ranking-invariant test, and the extended i18n parity gate. **Playwright e2e is a *separate* gate (`npm run test:e2e`)** and is *not* part of `check`; P0-19 stands up the first `e2e/` spec and both gates are run in verification.

**Explicitly out of P0:** ASCVD/PCE, FRAX, CKD/eGFR, hyperlipidemia, hypertension-screen, the PHQ/depression path (FR-12), any new `safety.ts` lab-value soft-escalate band, wearables, EHR/FHIR, clinician-override cadence (FR-10, stubbed only), and the ES flow (ships immediately after EN under F9).

---

## 2. Prerequisites & Dependencies

**Blocking (land before or with the engine):**

- **F2 demographics** — the engine is a pure function of demographics + labs; without `dateOfBirth`/`sex` no fixture is scorable and nothing is testable. Do this first. (FR-0)
- **F10 registry shape + one entry** — the ADA points table and USPSTF diabetes cadence ship as a single versioned, cited `clinical-datasets.ts` entry; the `SourceCitation` it exposes is load-bearing for F5.
- **F5 `SourceCitation` shape + regulatory-posture doc** — the risk-detail screen is a "recommending" surface; the doc's legal hold gates *real-patient* exposure, not local/fixture dev.

**Deferrable (P0 ships an honest degraded slice without them):** F1 backend, F8 return channel (lagging metrics only); F3 audit actor (P0 uses anonymous `recordAuditEvent()`).

**In-flight crisis task `task_e569880c` (F4): relevant to P1 only.** The P0 ADA path introduces no danger band, so it does not touch `safety.ts`. FR-12 (P1) must consume F4's merged `CRISIS_ACTIONS` and the `crisis_escalate`-first branch order; do not start FR-12 until F4 is merged and its ordering test is green.

**External dependencies:** none for P0 (no devices, no EHR, no backend). `HomeReading` (BP cuff) is present but only reused in P1's hypertension/ASCVD path.

---

## 3. Architecture & Approach

**New module — `src/domain/screening.ts` (the deterministic engine; never an LLM).** Net-new, parallel to — not inside — `condition-lens.ts` (which is a *nutrition* lens). It owns:

- Types: `ScreeningKind` (P0: `"diabetes"`), `RiskModelId` (P0: `"ada_cdc_diabetes"`), `RiskInput` (each carries `EvidenceStatus`, `resultDate`, `value`, `unit`), `RiskScore`, `ScreeningRecommendation`.
- `computeAdaRisk(profile, inputs, asOf): RiskScore` — pure; returns either a numeric band + `SourceCitation` + limitation note, or `{ status: "needs_review", missing: string[] }`. Mirrors the ADA/CDC points model (age, sex, family history, BMI, physical-activity flag, hypertension flag, gestational-diabetes flag). Coefficients come from the F10 registry, never inline.
- `computeDiabetesCadence(profile, inputs, asOf): ScreeningRecommendation` — USPSTF-based due/overdue/not-yet-indicated keyed on age + BMI + risk factors + last-A1c result date. `thresholdSource` defaults `standard_education`; a `clinician_authored` override short-circuits (FR-10 hook, **stubbed in P0**).
- `buildScreeningTasks(state, asOf): TaskItem[]` — maps recommendations → `kind: "screening"` tasks at **priority 2–3 only**, `status` reflecting provenance (`inferred` until confirmed; `needs_review` if provisional). Consumed by `buildTodayTasks`.

**New module — `src/domain/clinical-datasets.ts` (F10 registry).** One P0 entry: `{ id: "ada_cdc_diabetes", name, version, effectiveDate, license, owner, citation: SourceCitation }` plus the points table + USPSTF cadence rule it governs. `SourceCitation` type lives in `types.ts` (shared, per F5).

**New helper — `ageFromDob(dob, asOf)` in `src/domain/age.ts` (F2).** Derives age; **never persists** a computed age.

**Extend `src/domain/types.ts`:**
- `PatientProfile` += `dateOfBirth: string` (ISO), `sex: "female" | "male"`, `raceEthnicity?: RaceEthnicity | "declined" | "unknown"` (F2).
- `Condition` union += `"prediabetes"` (P0 minimum; full set in P1).
- `TaskItem.kind` += `"screening"` (there is no `"screening"` kind today — types.ts:77).
- `AppState` += `familyHistory: FamilyHistoryItem[]`, `importedLabs: ImportedLab[]`, `screeningRecommendations: ScreeningRecommendation[]`, `riskScores: RiskScore[]`.
- New: `SourceCitation`, `FamilyHistoryItem` (`condition`, `relation`, `status: EvidenceStatus`), `ImportedLab` (`kind`, `value`, `unit`, `resultDate`, `status`).

**Extend `src/domain/tasks.ts` `buildTodayTasks`.** After the existing urgent/threshold/barrier/visit pushes and **before** `.sort((l,r) => l.priority - r.priority).slice(0, MAX_TODAY_TASKS)` (tasks.ts:102), append `buildScreeningTasks(state)`.
**[FIX] The FR-5 guarantee mechanism, stated precisely:** `Array.prototype.sort` is stable in V8, so equal priorities keep insertion order. The invariant "screening never evicts a priority-1 safety task" holds **solely because screening tasks are priority ≥ 2** — a priority-1 task always sorts strictly ahead and survives any slice of ≥1. (Equal-priority ties among non-safety tasks are order-dependent but that is not safety-relevant.) Enforced by construction **and** by the P0-18 regression test.

**Extend `src/domain/care-team-message.ts` `buildCareTeamMessage`.** Signature `buildCareTeamMessage(state, screening?: ScreeningPayload)` (today it takes only `state` — care-team-message.ts:6). When `screening` is present, append an evidence-labeled block; still one-way, still on-device. With no payload, output is byte-identical.

**Extend `src/domain/health-brief.ts` `buildHealthBrief`.** Add a "Screening & Risk" section using the existing `{ title, items, status }` object shape (health-brief.ts:61–96); section `status` is `needs_review` while any input is provisional.

**[FIX] Extend the coach `why` path — this is *not* a template swap.** `inferAiMode` already routes "why do I even need this test" → `why` (intent.ts:12, regex `do i (even |really )?need` verified). **But the mock provider's `why` branch (mock-provider.ts:80–97) is medication-only:** with no single/named medication it returns "tell me which medication," which would pre-empt a screening explanation. Required work:
1. Add a screening/risk context field to `HealthAiRequest` in `src/ai/types.ts` so the recommendation reaches the provider.
2. Add a **new `why` branch that fires when screening context is present, placed *before* the medication-lookup logic** in `mock-provider.ts`.
3. Keep the response flowing through `createSafeAiResponse()` → `decideSafety()` unchanged. **No `safety.ts` change in P0.** The LLM only explains the number `screening.ts` already computed; it never computes it.

**Reducer/store (`src/state/store.tsx`).** New `HealthAction` variants + `healthReducer` cases: `addFamilyHistory`, `removeFamilyHistory`, `importLab`, `removeLab`, `computeScreening` (recompute + store `screeningRecommendations`/`riskScores`). Each case spreads state and appends `recordAuditEvent(state.patient.id, <verb>, <label>)` using existing verbs (`created`/`updated`/`ai_generated`) — matching the shipped pattern (store.tsx:42–93).

**[FIX] Data-flow clarity.** `buildTodayTasks(state)` is derived **at render** in `src/app/today/page.tsx:13`; it does **not** read `state.tasks`. So screening cards are computed live from `state.screeningRecommendations` via `buildScreeningTasks`, *not* persisted into `state.tasks`. `computeScreening` stores the engine *outputs* (recommendations/scores) that both the card and the detail screen read.

**Storage (`src/state/storage.ts`).** Add guards `isFamilyHistoryItem`, `isImportedLab`, `isScreeningRecommendation`, `isRiskScore`; extend `isPatient` (F2, 384–393), `isCarePlan` condition check (add `prediabetes`, 366–382), `isTask` kind check (add `screening`, 295–306). **[FIX] Migration ordering is load-bearing:** the existing `mealLog`/`doseEvents === undefined` back-fill runs at lines 484–489 **before** `isValidCoreAppState`. The four new `AppState` arrays must be defaulted to `[]` at that same seam, and **missing demographics back-filled into the nested `parsed.patient` object before validation** — because `isValidCoreAppState` calls the now-stricter `isPatient`. If `isPatient` is tightened without the nested back-fill, every existing user's persisted `home-health-ai-ownership-state` fails validation and is silently discarded (`safeRemoveItem` → `demoState`).

**New UI surface.** Risk-detail screen (score band, plain-language reasons, per-input evidence badges, missing-input prompts with "Add a past lab result" / "I don't have this", limitation note, one "Ask my care team about this" button) + a demographics/family-history/lab intake form. Route under `src/app/screening/` with a `screening` task `href` wired from `buildScreeningTasks`.

**Data flow (end to end):** patient enters demographics/family-history/lab → reducer stores them + audits → `computeScreening` runs `screening.ts` deterministically → recommendations/scores in state → `buildTodayTasks` derives a ranked `screening` card at render → detail screen renders score + evidence + uncertainty → "Ask my care team" → extended `buildCareTeamMessage` drafts → coach `why` explains through the safety gate. Every mutation audits.

---

## 4. Work Breakdown (sequenced)

### Milestone P0-A — Foundations wiring (F2 + F10 + F5 shapes)

- [ ] **P0-1 — Add demographics to `PatientProfile` (F2).** `dateOfBirth: string` (ISO), `sex: "female" | "male"`, `raceEthnicity?` in `src/domain/types.ts`. *Accept:* compiles; downstream type errors point at exactly the fixtures/guards to fix next.
- [ ] **P0-2 — `ageFromDob` helper.** Create `src/domain/age.ts`. *Accept:* unit test — DOB `1972-03-01`, asOf `2026-07-05` → 54; birthday-boundary cases.
- [ ] **P0-3 — Update `isPatient()` + migration (F2). [FIX]** Validate new fields in `isPatient()` (`storage.ts` 384–393); add the demographics back-fill **into `parsed.patient`** at the 484–489 seam, *before* `isValidCoreAppState`. *Accept:* unit test — legacy six-field patient JSON loads and gains defaulted demographics (not discarded); a genuinely malformed patient still falls back to `demoState`.
- [ ] **P0-4 — Back-fill existing fixtures with demographics.** Give `demoState`, `brentState`, `deletedDemoState` demographics. *Accept:* fixtures typecheck.
- [ ] **P0-4b — [FIX] Add a scorable Dolores fixture.** Neither `demoState` (Jordan: hypertension, no glucose) nor `brentState` (**already diabetic** — A1c 8.0%, metformin) is a valid *undiagnosed-prediabetes* subject. Add a new `doloresState` fixture (age ~54, female, family history of diabetes, BMI ~31, no diabetes diagnosis, no/aged A1c) so the ADA-detection path is demoable and e2e-testable. *Accept:* `computeAdaRisk(doloresState…)` returns an elevated band; `computeDiabetesCadence` returns due/overdue.
- [ ] **P0-5 — F10 registry + ADA entry.** Define `SourceCitation` in `types.ts`; create `src/domain/clinical-datasets.ts` with the `ada_cdc_diabetes` entry (points table + `version`/`effectiveDate`/`license`/`owner`/`citation`) and the USPSTF diabetes-cadence rule with its own citation. *Accept:* exports a typed points table + `SourceCitation`; review checklist requires a citation on any new "recommending" dataset (F5).

### Milestone P0-B — Deterministic engine (FR-3, FR-4)

- [ ] **P0-6 — Screening/risk types.** Add `ScreeningKind`, `RiskModelId`, `RiskInput`, `RiskScore`, `ScreeningRecommendation`, `FamilyHistoryItem`, `ImportedLab` to `types.ts`; widen `Condition` (`prediabetes`) and `TaskItem.kind` (`screening`); extend `AppState` with the four arrays. *Accept:* compiles; every `switch`/guard on `Condition`/`TaskItem.kind` now flags the exact spots to update.
- [ ] **P0-7 — `computeAdaRisk` (deterministic, never LLM).** In `src/domain/screening.ts`, using the F10 points table. Insufficient → `{ status: "needs_review", missing }`; sufficient → band + `SourceCitation` + limitation note (staleness + population caveat). *Accept:* P0-17 tests prove correct bands for known input vectors and `needs_review` naming the missing field; **no path returns a fabricated number.**
- [ ] **P0-8 — `computeDiabetesCadence` (deterministic).** USPSTF-based, keyed on age/BMI/risk factors/last-A1c result date; `thresholdSource` defaults `standard_education`; `clinician_authored` override short-circuits (FR-10 stub). *Accept:* overdue when last A1c > window; not-yet-indicated below age/BMI threshold; override respected.
- [ ] **P0-9 — `buildScreeningTasks`.** Map recommendations → `kind: "screening"` tasks at **priority 2–3 only**. *Accept:* returns priority-≥2 tasks only; unit test asserts no screening task is ever priority 1.

### Milestone P0-C — Ranking guard + surfaces

- [ ] **P0-10 — Wire screening tasks into `buildTodayTasks` with the FR-5 guard.** Append `buildScreeningTasks(state)` after existing pushes, before `.sort().slice()`. *Accept:* covered by P0-18.
- [ ] **P0-11 — Reducer actions + audit.** Add the five actions to `HealthAction`/`healthReducer`; each appends one `recordAuditEvent(...)`. *Accept:* unit test — each action mutates the right slice and appends exactly one descriptively-labeled audit event.
- [ ] **P0-12 — Storage guards + migration for new state. [FIX]** Add the four new item guards + to `isValidCoreAppState`; default the four arrays to `[]` at the 484–489 seam (before validation); extend `isCarePlan` (`prediabetes`) and `isTask` (`screening`). *Accept:* unit test — malformed family-history entries are sanitized not discarded; legacy state without the new arrays loads with `[]`; legacy patient without demographics is migrated, not nuked.
- [ ] **P0-13 — Extend `buildCareTeamMessage` (FR-8).** Optional `screening` payload → evidence-labeled block; never orders/marks done. *Accept:* with payload, draft names the due screen + each reason + each input's evidence label; **without payload, output byte-identical to today.**
- [ ] **P0-14 — Extend `buildHealthBrief` (FR-9).** Add "Screening & Risk" section; `status = needs_review` while any input is provisional. *Accept:* section present with correct items/status for a scored fixture; absent-data renders an honest placeholder.
- [ ] **P0-15 — Coach `why` for screening (FR-7). [FIX — larger than a template].** (a) Add screening context to `HealthAiRequest` in `src/ai/types.ts`; (b) add a screening `why` branch in `src/ai/mock-provider.ts` **before** the medication-lookup fallback; (c) add `earlyDetectionStrings` (EN) via the F9-generalized `strings.ts`. Response still flows through `createSafeAiResponse()` unchanged; **no `safety.ts` change.** *Accept:* "why do I even need this test?" returns a plain-language, evidence-labeled rationale + the "not a diagnosis; your care team decides" note; existing coach + safety-gate tests stay green.
- [ ] **P0-16 — UI: risk-detail + intake.** Build the risk-detail screen + demographics/family-history/lab intake form under `src/app/screening/`; wire the `screening` task `href`. *Accept:* provisional score is visibly labeled provisional; "I don't have this" and "Add a past lab result" both recompute live.

### Milestone P0-D — Verification

- [ ] **P0-17 — Deterministic engine unit tests.** `src/domain/screening.test.ts`: ADA bands for known vectors; `needs_review` **names the missing field**; no fabricated-number path; cadence overdue/not-indicated/override; staleness→provisional (FR-13); `ageFromDob` boundaries (or in `age.test.ts`).
- [ ] **P0-18 — FR-5 ranking-invariant test.** Add to `src/domain/tasks.test.ts` (fake timers at `2026-07-05`, matching the existing suite): with a co-occurring **priority-1** safety/threshold reading AND ≥2 screening recommendations, the sliced output still contains the priority-1 safety task and drops only screening items. Must stay green forever.
- [ ] **P0-19 — Playwright e2e. [FIX] Path is `e2e/`, not `tests/e2e/`** (`playwright.config.ts` → `testDir: "./e2e"`; the dir does not exist yet). Create the first spec: Dolores flow — demographics → family history → A1c → ranked screening card on Today → detail (evidence badges + provisional label) → "Ask my care team" draft → assert nothing is "ordered/done."
- [ ] **P0-20 — Gates green. [FIX]** `npm run check` (`lint && test && build`) green including P0-17/P0-18 and the extended F9 parity gate; **`npm run test:e2e` green separately** (it is *not* in `check`).

### P1 (next slice, gated on F4)
Hypertension-screen (`HomeReading` reuse), hyperlipidemia + **ASCVD/PCE**, CKD (eGFR/ACR), osteoporosis/**FRAX**; **new `safety.ts` lab-value soft-escalate bands** (eGFR/A1c/LDL) behind clinical sign-off; **depression/self-harm hard-escalation (FR-12)** consuming F4's as-built `CRISIS_ACTIONS`; clinician-override cadence (FR-10); wearable resting-HR/sleep as risk inputs. Requires F5's formal FDA read before broad risk-score exposure.

### P2
FHIR import (auto-populate FR-2, mark `imported`), ADT-triggered recompute, clinician confirm/close surface (F8/F1 — unlocks lagging metrics), cancer-screening cadence as a same-engine extension, paired-device hooks (F7).

---

## 5. Data Model & Storage Changes

**Type changes (`src/domain/types.ts`):**
- `PatientProfile` += `dateOfBirth: string`, `sex: "female" | "male"`, `raceEthnicity?: RaceEthnicity | "declined" | "unknown"`.
- `Condition` += `"prediabetes"` (P0); full set in P1.
- `TaskItem.kind` += `"screening"`.
- New: `SourceCitation` (`datasetName`, `version`, `effectiveDate`, `url`), `FamilyHistoryItem`, `ImportedLab`, `RiskInput`, `RiskScore`, `ScreeningRecommendation`, `ScreeningKind`, `RiskModelId`.
- `AppState` += the four new arrays.

**New reducer actions (`HealthAction` in `store.tsx`):** `addFamilyHistory`, `removeFamilyHistory`, `importLab`, `removeLab`, `computeScreening` — each appends `recordAuditEvent(...)`.

**Serialization/guards (`storage.ts`):** extend `isPatient`/`isCarePlan`/`isTask`; add `isFamilyHistoryItem`/`isImportedLab`/`isScreeningRecommendation`/`isRiskScore` and add them to `isValidCoreAppState`.

**[FIX] Migration — the single biggest silent-data-loss risk.** The validator is strict: `isValidCoreAppState` → `false` discards state. Two things must happen at the 484–489 back-fill seam, *before* validation runs:
1. Default the four new `AppState` arrays to `[]` when absent (mirrors `mealLog`/`doseEvents`).
2. Back-fill missing demographics into the **nested `parsed.patient`** object (so the tightened `isPatient` passes) — this is more delicate than the top-level array back-fill and is easy to miss.
A regression test must load a real legacy blob (pre-demographics, pre-new-arrays) and assert it survives with defaults, not `demoState`.

---

## 6. AI / Model Wiring

- **Deterministic, never LLM (FR-4):** `computeAdaRisk` + `computeDiabetesCadence` in `screening.ts`. Clinical math is auditable + unit-tested; the LLM never invents a risk number. Single most important wiring rule.
- **Haiku (high-volume):** short per-recommendation "reason" strings + EN/ES localization; normalizing free-text lab entries ("A1c 6.1" → `ImportedLab`). Mock path uses templates; live path routes through `HealthAiProvider`.
- **Sonnet (analysis/generation):** coach `why`/`explain` narrative + Health Brief "Screening & Risk" prose.
- **Streaming:** via the existing `HealthAiProvider`; mock provider stays the zero-key default (no key → mock).
- **Safety-gate flow:** all coach output goes through `createSafeAiResponse()` → `decideSafety()`. **[FIX] P0 adds no new branch and no new `safety.ts` pattern** (verified: `safety.ts` today = BP bands + physical urgent symptoms + med-change only; no lab bands, no self-harm). The existing medication-change soft-block already handles "so should I just start a statin?" P1's lab-value soft-escalate and depression hard-escalate are the net-new safety code, gated on clinical sign-off + F4. **Also [FIX]:** the coach change requires a new `HealthAiRequest` field + a new provider branch ahead of the medication fallback (§3, P0-15), not just a new string.

---

## 7. Testing Strategy

**Vitest unit (deterministic first — where correctness lives):**
- `src/domain/screening.test.ts` — ADA bands for known vectors; `needs_review` **names the missing field**; no fabricated-number path; cadence overdue/not-indicated/override; staleness→provisional (FR-13).
- `src/domain/age.test.ts` (or in screening.test) — `ageFromDob` boundaries.
- `src/domain/tasks.test.ts` — **FR-5 ranking invariant** (P0-18), matching the suite's `vi.setSystemTime("2026-07-05…")` convention.
- `src/domain/care-team-message.test.ts` — with/without screening payload; no-payload output unchanged.
- `src/domain/health-brief.test.ts` — "Screening & Risk" section presence/status.
- `src/state/storage.test.ts` — **legacy-blob migration** (nested demographics back-fill + new arrays default `[]`, state survives) and malformed-entry sanitization.
- `src/state/store.test.ts` — each new reducer action mutates the right slice + audits once.

**Safety-regression tests that MUST stay green (do not touch `safety.ts`/`safety-gate.ts` in P0):**
- Existing `classifySafety`/`decideSafety` suites: dangerous-vital hard-escalate, medication-change soft-block, urgent-symptom escalate — outcomes unchanged by the ADA path.
- **Add one guard test:** a screening `why` request with a co-occurring dangerous reading still hard-escalates. This is guaranteed by `decideSafety`'s branch order (safety-gate.ts 48–86 run before the provider is called), and the test locks it: screening context can never demote a real safety signal.

**Playwright e2e (`e2e/`, the config's `testDir`):**
- Dolores flow (P0-19): demographics → family history → A1c → ranked screening card on Today → detail (evidence badges + provisional label) → "Ask my care team" draft → assert no order/done state.
- Missing-input flow: open detail with insufficient inputs → `needs_review` naming the missing field → "Add a past lab result" recomputes live.

---

## 8. Rollout, Flags & Verification

**No flag framework — env toggles only.** P0 is fully exercisable in the **default mock path** (`HEALTH_AI_PROVIDER` unset/`mock`, no key): deterministic scores compute locally, coach `why` uses templates. Set `HEALTH_AI_PROVIDER=openai` + `HEALTH_AI_API_KEY` only to exercise the live `why` narrative — the score is deterministic either way.

**Demo/verify P0 locally:** `npm run dev`; use the **`doloresState`** fixture; confirm (a) the screening card never outranks a safety card on Today, (b) a provisional score is labeled provisional, (c) the care-team draft names the screen + evidence and orders nothing, (d) the Health Brief shows the new section. Run **`npm run check`** for the lint+test+build gate and **`npm run test:e2e`** for the Playwright gate.

**Gate before any real-PHI use (hard):**
- **F5 legal hold** on the risk-detail "recommending" surface must clear (`regulatory-posture-design-spec.md` counsel sign-off) before real patients see a computed score.
- **F10 clinical sign-off** on the ADA/USPSTF dataset version before patient exposure.
- **F1 + BAA** before any live-provider inference or EHR import moves PHI (P2). P0's mock path keeps all computation on-device.
- **F4 merged + ordering test green** before the P1 depression path ships.

---

## 9. Risks, Open Questions & Decisions Needed

- **FDA SaMD / non-device-CDS line (legal, blocks broad P1; sign-off wanted for P0 patient exposure).** The design (transparent inputs, cited source, clinician-in-the-loop, no autonomous action) is chosen to stay non-device, but F5's counsel read is required before real patients see the ADA score. Local/fixture demo is not gated.
- **Guideline currency & ownership (clinical, ongoing).** Who owns versioning + clinical sign-off of the seeded ADA/USPSTF rules, and the prevalence figures in the spec's Problem section? A stale rule is a patient-safety issue. Needs a named clinical owner for the F10 entry.
- **Migration blast radius (engineering, P0). [FIX]** Tightening `isPatient` for demographics without back-filling nested `parsed.patient` before validation silently wipes every existing user's localStorage. The migration test (P0-3/P0-12) is the guard; treat it as release-blocking.
- **Race-based PCE vs. race-free (clinical + equity, P1).** Not a P0 blocker (ADA doesn't key on race) but the P1 ASCVD path forces the choice; race stays optional with "prefer not to say."
- **One-way channel, unmeasurable primary outcome (product).** Without F8, screening-completion and rejection-rate are unmeasurable; P0 reports self-reported proxies only.

---

## 10. Effort & Sequencing Estimate

T-shirt sizing (relative, mock-path prototype):
- **P0-A Foundations wiring (F2/F10/F5 shapes)** — **M.** Mechanical type/guard/fixture work **plus the migration branch (the fiddly, high-risk part)** and the new Dolores fixture.
- **P0-B Deterministic engine** — **M.** The ADA points model + USPSTF cadence + tests are the intellectual core; get `needs_review`/no-fabrication exactly right.
- **P0-C Ranking guard + surfaces** — **M–L.** Reducer/storage/care-team/brief extensions are S each; **the coach `why` change is larger than it looks (new request field + provider branch)**; the risk-detail + intake UI is the single largest chunk; the FR-5 test is small but load-bearing.
- **P0-D Verification** — **S–M.** Unit tests track the engine (write alongside P0-B); Playwright infra (`e2e/` dir is new) + both gates at the end.

**Suggested build order:** P0-1 → P0-4/P0-4b (demographics + fixtures incl. Dolores, unblocks everything) → P0-3 (migration, with its test) → P0-5 (registry) → P0-6 (types) → P0-7/P0-8 (engine + tests as you go) → P0-9/P0-10/P0-18 (tasks + ranking guard + its test) → P0-11/P0-12 (reducer + storage) → P0-13/P0-14 (care-team + brief) → P0-15 (coach `why`: request field + provider branch + EN strings) → P0-16 (UI) → P0-17/P0-19/P0-20 (verify both gates). Land EN first; add ES (Rosa) immediately after under the F9 parity gate. Do not begin the P1 depression path until `task_e569880c` (F4) merges with its ordering test green.
