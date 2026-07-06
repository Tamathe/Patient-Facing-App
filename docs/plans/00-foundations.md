# Foundations Plan — Shared Platform Work

_Companion to the seven feature specs in `docs/specs/01..07`. Source primitives verified against the live codebase (Next.js 15 / React 19, localStorage-backed prototype, mock-or-OpenAI provider behind a deterministic safety gate)._

## Purpose

Reading the seven feature specs (`01-early-detection` … `07-access-equity`) surfaces the same handful of platform gaps over and over: the app has no HIPAA-compliant backend, `PatientProfile` has no demographics, `AuditEvent` cannot record who did what, the crisis pathway stops at "call the clinic," and there is no documented FDA posture. Every spec re-derives these, re-scopes them, and sometimes mislabels net-new safety code as "reuse."

This document factors those cross-cutting prerequisites into numbered **Foundations Items (F1…F10)** so that:

- **Feature plans reference, not re-derive.** A feature plan says "blocked on **F1** (backend) and **F2** (demographics)" instead of re-explaining localStorage and re-deciding the `PatientProfile` shape. When this doc changes, every dependent plan inherits the change.
- **Shared types change once.** `PatientProfile`, `AuditEvent`, `Condition`, and the safety gate are touched by multiple features. Extending them in one coordinated pass avoids merge conflicts and divergent shapes across seven parallel sprints.
- **Regulatory and safety posture is decided once, centrally.** The FDA non-device-CDS line (F5) and the crisis pathway (F4) are load-bearing for patient safety and legal exposure; they must not be re-litigated per feature with different answers.

**How to reference this doc from a feature plan:** in the plan's "Foundations dependencies" section, list the F-items it needs and mark each **blocking** (feature cannot ship without it) or **helpful** (feature is better with it but can ship a degraded slice). Do not restate the F-item's tasks; link to the F-item and note only the feature-specific delta (e.g., "F6 + a `heart_failure` lens with weight-trend rules").

---

## Foundations Items

### F1 — HIPAA-compliant persistence backend (off localStorage)

**Current state.** The app is client-only. `src/state/store.tsx` runs a single `useReducer` whose state is serialized to `window.localStorage` on every change via `saveStoredState()` / `loadStoredState()` in `src/state/storage.ts` (`STORAGE_KEY = "home-health-ai-ownership-state"`). There is no server database (no Prisma, no API persistence), no auth, no per-user isolation, and no server-side audit. `src/app/api/` contains only stateless proxies (`food/lookup`, `realtime/token`). All PHI lives unencrypted in one browser's localStorage.

**Why it blocks.** Every clinician-facing or multi-patient surface in the specs is legally un-shippable on this substrate: the between-visit **worklist** (spec 02), the **coordination queue** (spec 06), the behavioral-health **review queue** (spec 04), any **EHR write-back / read-back** (specs 01, 05), and the first **server-side PII store** for SMS/phone (spec 07). Real PHI needs a Business Associate Agreement (BAA) with the hosting provider and the LLM provider, encryption at rest and in transit, authn/authz with per-patient row scoping, breach logging, and a durable audit trail (see F3).

**Target state.** A HIPAA-eligible backend: managed Postgres (BAA-covered) with an ORM, per-patient authorization, encryption at rest, structured server-side audit log, and a BAA/no-retention tier with the LLM provider. The client reducer is reframed as an offline cache that syncs to the server; `AppState` becomes the server's per-patient projection. **Patient-facing single-user surfaces (Coach, Food Lens, medicines, numbers) may continue to run local-first** as a documented v1 posture; only clinician-facing and multi-patient surfaces are hard-gated on this item.

**Concrete tasks.**
- [ ] Write a persistence ADR in `docs/` (naming per repo convention: `persistence-architecture-design-spec.md`) covering hosting/BAA choice, encryption, authz model, audit, and data-residency; get legal sign-off recorded in the doc.
- [ ] Introduce a server data layer (ORM + migrations) modeling the existing `src/domain/types.ts` entities as per-patient rows; keep `AppState` as the client projection shape.
- [ ] Add auth + per-patient row scoping; add a `patient_id`-scoped authorization guard on every read/write path.
- [ ] Add a server-side audit sink that consumes the F3 actor-bearing `AuditEvent` (server is the system of record; client audit becomes a mirror).
- [ ] Refactor `src/state/storage.ts` into a sync adapter (local cache ↔ server) behind the existing `loadStoredState`/`saveStoredState` interface so patient surfaces are minimally disturbed.
- [ ] Execute BAA + enterprise/no-retention agreement with the LLM provider before any clinician surface touches real PHI.

**Depended on by.** 02 (blocking), 04 (blocking), 05 (blocking, for cohort metrics + backend), 06 (blocking), 07 (blocking, first server-side PII store); 01 (blocking for care-team read-back metrics, helpful otherwise); 03 (blocking for PHI egress to referral partners).

**Sequencing.** Longest-lead item; start P0 in parallel with everything else. No clinician-facing or multi-patient feature slice may go to real patients before F1 + F3 land. Patient-facing demo/fixture slices may proceed against local state in the meantime.

---

### F2 — `PatientProfile` demographic fields (age / sex / DOB, + race/ethnicity)

**Current state.** `PatientProfile` in `src/domain/types.ts` is: `id, name, preferredName, language ("en"|"es"), primaryClinicName, primaryClinicPhone`. **There is no DOB, age, sex, or race/ethnicity.** The persistence validator `isPatient()` in `src/state/storage.ts` (lines 384–394) checks exactly those six fields, so any added field also needs a guard update and a migration/back-fill path.

**Why every risk score needs them.** All quantitative risk engines in spec 01 are pure functions of demographics plus labs/vitals:
- **ASCVD (Pooled Cohort Equations):** requires age, sex, and race (Black vs. other) as first-class inputs.
- **FRAX:** requires age and sex (plus weight/height).
- **ADA diabetes risk:** requires age and sex.
- **USPSTF screening cadence** rules (when to screen for what) are keyed on age and sex.

Without these fields the risk engine is not merely inaccurate — it is **untestable**: fixtures cannot construct a patient the engine can score, so spec 01's P0 cannot even be unit-tested. This is a type change, not a data-entry feature.

**Target state.** `PatientProfile` gains `dateOfBirth: string` (ISO date; age derived, never stored stale), `sex: "female" | "male"` (birth-sex for equations, documented as clinical-input sex distinct from gender identity), and `raceEthnicity` as an **optional** field with an explicit "declined / unknown" value so PCE/FRAX can degrade transparently rather than silently mis-score. Race is used only where an equation requires it and is surfaced as a labeled, editable input (ties into F5's transparency posture and the equity risk in spec 01).

**Concrete tasks.**
- [ ] Extend `PatientProfile` in `src/domain/types.ts` with `dateOfBirth`, `sex`, and optional `raceEthnicity` (union incl. `declined`/`unknown`).
- [ ] Add an `ageFromDob(dob, asOf)` helper in `src/domain/` (derive age; never persist a computed age).
- [ ] Update `isPatient()` in `src/state/storage.ts` (lines 384–394) to validate the new fields; add a migration branch in `loadStoredState()` that back-fills missing demographics as `unknown`/`null` rather than discarding stored state.
- [ ] Update fixtures in `src/domain/fixtures.ts` so demo patients carry demographics and the risk engine is testable.
- [ ] Add labeled, editable demographic inputs to the patient/profile surface with an explicit "prefer not to say" path.

**Depended on by.** 01 (blocking — no risk score without it); 05 (helpful — deprescribing/age-based Beers criteria use age); 04 (helpful — some screening cadence is age-keyed).

**Sequencing.** Small, self-contained, P0. Do this before any spec-01 engine work; unblocks fixtures immediately.

---

### F3 — `AuditEvent` actor field + action-union extension

**Current state.** `AuditEvent` in `src/domain/types.ts` (lines 127–133) is `{ id, patientId, action, label, createdAt }` where `action` is a **closed union**: `"created" | "updated" | "ai_generated" | "shared" | "exported" | "deleted"`. **There is no `actor` field** — every event is anonymous. `recordAuditEvent(patientId, action, label)` in `src/domain/audit.ts` stamps a UUID and timestamp only. The store (`src/state/store.tsx`) calls it with a fixed action + human label on each mutation, and `isAuditEvent()` in `src/state/storage.ts` (lines 346–360) hard-codes the six action strings.

**Why it blocks.** Clinician workflows require "who did what and why" auditing that the current shape cannot record:
- **Disposition auditing** (spec 02 worklist, spec 06 queue): who **dispositioned / snoozed / dismissed-with-reason** an alert, and when. No `actor`, no disposition actions → unrecordable.
- **Accountability for clinician actions** (spec 04 review queue, spec 06 reconciliation): closing a referral loop, acknowledging a crisis flag, confirming a med reconciliation — all need an actor and an action verb.

**Target state.** `AuditEvent` gains `actor: { kind: "patient" | "clinician" | "system"; id: string }` (system for reducer-automatic mutations, preserving today's behavior). The `action` union is **extended**, not replaced, with disposition/coordination verbs (e.g. `dispositioned`, `snoozed`, `dismissed`, `acknowledged`, `referral_opened`, `referral_closed`, `crisis_flagged`). `label` remains the free-text human summary; an optional `reason` field captures dismiss-with-reason.

**Extension convention (so features don't fork the union).**
1. Add the new action string to the `AuditEvent["action"]` union in `types.ts`.
2. Add it to the `isAuditEvent()` guard in `storage.ts` (lines 346–360) **and** to any server-side validator once F1 lands.
3. Route mutations through `recordAuditEvent()` (extended to take `actor` and optional `reason`); never construct `AuditEvent` objects inline.
4. Default `actor` to `{ kind: "system", id: "reducer" }` for the existing automatic reducer audits so current behavior is unchanged.

**Concrete tasks.**
- [ ] Add `actor` (+ optional `reason`) to `AuditEvent` and extend the `action` union in `src/domain/types.ts`.
- [ ] Update `recordAuditEvent()` in `src/domain/audit.ts` to accept and stamp `actor`/`reason`; default reducer callers to `system`.
- [ ] Update every `recordAuditEvent(...)` call site in `src/state/store.tsx` to pass `system` actor.
- [ ] Update `isAuditEvent()` in `src/state/storage.ts` (lines 346–360) to accept `actor`/`reason` and the extended action strings; add a migration that stamps legacy events with `system` actor.
- [ ] Once F1 lands, mirror the same action union in the server audit validator.

**Depended on by.** 02 (blocking), 06 (blocking), 04 (blocking for review-queue accountability); 01 (helpful — care-team confirm/close events); 05 (helpful — deprescribing acknowledgements).

**Sequencing.** Small type change, P0. Land alongside F1's audit sink so client and server share the extended shape from day one.

---

### F4 — Crisis pathway + safety-gate extension conventions (coordinates with in-flight `task_e569880c`)

**Current state.** The deterministic gate is `decideSafety()` in `src/ai/safety-gate.ts`, which returns hard-escalate / soft-escalate / soft-block / allowed. Care-team actions are a fixed constant `CARE_TEAM_ACTIONS: AiMessageAction[] = ["call_clinic", "draft_message"]` (`safety-gate.ts:7`), and `AiMessageAction` in `types.ts:102` is exactly `"call_clinic" | "draft_message"`. **There is no `988`, `911`, or `crisis` action anywhere in `src/`** (verified — grep returns nothing). Pattern matching lives in `classifySafety()` (`src/domain/safety.ts`) and today recognizes only BP bands and physical urgent symptoms — **no self-harm / suicidality patterns**. Critically, in the real `decideSafety()` the **stored-reading and dangerous-vitals branches run first** (`safety-gate.ts` lines 48–86), *before* free-text input safety (line 84) — so a co-occurring hypertensive reading can currently pre-empt a free-text crisis disclosure.

**In-flight work — `task_e569880c` (separate session, building now).** That task is adding a `crisis` / `call_988` action, making `crisis_escalate` the **literal first branch** of `decideSafety()` (above the stored-reading branches), and gating the live realtime-voice path so spoken crises re-enter the gate. **Plans MUST NOT assume the current `CARE_TEAM_ACTIONS` shape or the current branch order.** Treat the crisis pathway as an in-flight foundations dependency owned by `task_e569880c`.

**Expected new shape (consume once it lands — do not re-build).**
- `AiMessageAction` extends to include a crisis action (expected `"call_988"`, possibly `"call_911"`); a dedicated `CRISIS_ACTIONS` constant analogous to `CARE_TEAM_ACTIONS`.
- `decideSafety()` gains a `crisis_escalate` branch as its **first** conditional, returning crisis copy + crisis actions, so no other signal (including a dangerous vital) can demote a suicidality disclosure. An **explicit ordering test** locks this in.
- `classifySafety()` (or a sibling `classifyCrisis()`) gains self-harm/suicidality patterns as a **supplementary** net; structured PHQ-9 item-9 is the **primary** net for spec 04.
- The live realtime path (`src/ai/realtime-session.ts`, consumed by `use-food-voice-session.ts` / any voice Coach) is gated so streamed model audio cannot bypass the gate (spec 07 FR-6a).

**How features should consume it.**
1. Do not hard-code `["call_clinic","draft_message"]`; import the exported action constants from `safety-gate.ts`.
2. To add a new hazard class, add patterns to `classifySafety()`/`classifyCrisis()` and a branch in `decideSafety()` **below `crisis_escalate` but respecting the documented tier order** (crisis → hard-escalate vitals/symptoms → soft-escalate threshold → soft-block med-change). Never insert a branch above `crisis_escalate`.
3. Keep the two urgency tiers distinct across channels/languages: a dangerous vital (e.g., SBP 182) is a **hard escalate** ("seek urgent help now"), not a soft `call_clinic` (spec 07 risk).
4. Add an ordering test whenever you add a branch, asserting a co-occurring lower-tier signal cannot pre-empt a higher-tier one.

**Concrete tasks (foundations-side; the action/branch/gating land in `task_e569880c`).**
- [ ] **Coordinate:** confirm `task_e569880c`'s merged shape (exact action string(s), `CRISIS_ACTIONS` export name, gate ordering, realtime gating) and update this F4 section to the as-built shape before dependent features start.
- [ ] Publish the "hazard-class extension convention" above in this doc as the single reference for specs 01/03/04/05.
- [ ] Add EN/ES crisis copy keys through F9 (crisis banner, 988/911 labels) so voice + Spanish inherit them.
- [ ] Ensure the abnormal-lab soft-escalate (spec 01: eGFR/A1c/LDL) and depression hard-escalate (spec 04) are scoped as **net-new, clinically reviewed** safety code — not "reuse."

**Depended on by.** 04 (blocking — crisis is the feature), 03 (blocking — SI/mood/IPV items are gated behind it, FR-16), 07 (blocking — voice must not bypass the gate, FR-6a); 01 (blocking for the depression-screen crisis path); 05 (helpful — hypoglycemia emergency cards live alongside the gate).

**Sequencing.** `task_e569880c` is P0 and already running. All crisis-touching feature work waits on its merge, then consumes the as-built shape. This is the single hardest safety dependency — do not let any depression/SI/IPV/voice slice ship before it lands and its ordering test is green.

---

### F5 — Evidence-status & threshold-source conventions; documented FDA regulatory posture

**Current state.** Two provenance primitives already exist and are used consistently: `EvidenceStatus = "confirmed" | "patient_reported" | "imported" | "inferred" | "needs_review"` and `ThresholdSource = "clinician_authored" | "standard_education"` (`types.ts` lines 1–2), the latter carried on `CarePlan.thresholdSource`. Facts, meds, and brief sections all carry `EvidenceStatus`. **What does not exist is any documented FDA posture** — no doc states why computing/showing ASCVD/FRAX/ADA, threshold-based action prompts, deprescribing suggestions, or reconciliation verdicts stays on the non-device / non-device-CDS side of the line. Every spec (01, 02, 04, 05, 06, 07) independently flags this as its top gating risk.

**Why it recurs.** The whole product bet — transparent inputs, cited sources, clinician-in-the-loop, "surface data + route to a human, never autonomously recommend a clinical action" — is a bet on staying **non-device CDS** under the 21st Century Cures §520(o)(1)(E) exemption, whose "independent review" prong requires that a clinician can review the basis of each recommendation. Several features (titration in 05, device signals in 02, reconciliation verdicts in 06) sit right on the line and need a formal read.

**Target state.**
1. A single **regulatory-posture doc** in `docs/` (`regulatory-posture-design-spec.md`) stating the non-device-CDS rationale, the four exemption prongs, and a per-feature classification (non-device / non-device-CDS / needs-legal-hold), reviewed by counsel.
2. A **threshold-provenance convention** extending the existing `ThresholdSource` idea: every displayed number that could read as a clinical recommendation (risk score, lab flag, weight-trend rule, Beers/STOPP entry) must carry (a) its source/citation and (b) an evidence/threshold-source label, so the UI can always show "why this, from where." This is the concrete mechanism that keeps outputs on the "transparent, reviewable" side.
3. Copy-review gate: any string that reads as a diagnosis, dose recommendation, or interaction verdict is held for legal/clinical copy review before patient/clinician exposure (specs 06 FR-9, 05, 02).

**Concrete tasks.**
- [ ] Author `docs/regulatory-posture-design-spec.md`; get counsel sign-off; list each feature's classification and any P-gate holds.
- [ ] Generalize the provenance convention: define a shared `SourceCitation` shape (dataset name, version, date, URL) to hang off risk scores, lab thresholds, and rule tables; reuse `EvidenceStatus`/`ThresholdSource` labels in `src/domain/labels.ts`.
- [ ] Add a CI/lint or review checklist entry requiring a citation + evidence label on any new "recommending" surface.
- [ ] Record the required datasets' license/owner/date (PCE, FRAX, USPSTF, Beers/STOPP) — feeds F10.

**Depended on by.** 01, 02, 04, 05, 06, 07 (all **blocking** at the P-gate where the feature first exposes a "recommending" surface); 03 (blocking for any condition-naming inference).

**Sequencing.** The doc is P0 (cheap, unblocks scoping); the per-feature legal holds gate each feature's first "recommending" P-phase. Start the counsel read early — it is long-lead like F1.

---

### F6 — `Condition` union / `CarePlan`-config extension pattern

**Current state.** `Condition` in `types.ts:19` is exactly `"hypertension" | "diabetes" | "obesity"`, carried on `CarePlan.condition`. Adding a condition touches at least: (1) the union in `types.ts`; (2) `isCarePlan()` in `src/state/storage.ts` (lines 366–382, which hard-codes `value.condition === "hypertension" || ... "diabetes" || ... "obesity"`); (3) `selectLens()` in `src/domain/condition-lens.ts` (lines 139–149) plus a `ConditionLens` definition. Note the diabetes and obesity lenses are **stubs** today (`nutrientRules: []`, `medDietRules: []`) — the pattern exists but only hypertension is fully populated.

**Why it recurs.** Spec 06 (and 02) need **`heart_failure`**, which is not a modeled condition. The specs correctly flag that "CHF lens reuse" is actually net-new: it touches `CarePlan.condition`, `selectLens()`, and needs HF-specific rules (weight-trend thresholds, not just sodium). Any new chronic loop in spec 05 hits the same three-touchpoint pattern.

**Target state.** A documented, mechanical **"add a condition" checklist** so every feature adds conditions identically, plus a fully-populated lens per newly-supported condition (not a stub).

**Extension pattern (the canonical checklist).**
- [ ] Add the condition string to `Condition` in `src/domain/types.ts`.
- [ ] Add it to the `isCarePlan()` condition guard in `src/state/storage.ts` (lines 366–382) — **and** the server validator once F1 lands.
- [ ] Add a `ConditionLens` (real `nutrientRules` + `medDietRules` + `personaFocus` + `betterOptionGuidance`) in `src/domain/condition-lens.ts` and a `case` in `selectLens()`.
- [ ] Add fixtures for the new condition in `src/domain/fixtures.ts`.
- [ ] Backfill the two stub lenses (diabetes, obesity) if a feature actually relies on them (spec 05).
- [ ] Add EN/ES strings for any new flags via F9.

**Concrete tasks.**
- [ ] Publish the checklist above in this doc as the single reference.
- [ ] For spec 06: add `heart_failure` to the union + guard + a real HF `ConditionLens`; note HF also needs weight-trend rules that live beyond `condition-lens.ts` (in the monitoring/threshold layer of spec 02) — call that out so it is not under-scoped as "lens reuse."

**Depended on by.** 06 (blocking — needs `heart_failure`), 02 (blocking — HF monitoring), 05 (blocking — populated diabetes/obesity lenses for chronic loops); 03 (helpful — food-is-medicine reuses lenses).

**Sequencing.** Mechanical, P0/P1. Do the union+guard+lens as one atomic change per condition so partial states never persist (the storage guard would reject a plan whose condition the guard doesn't know).

---

### F7 — Device / sensor hook pattern (from `use-food-camera.ts` + `food-lookup.ts` degradation)

**Current state.** Two reusable patterns are already proven:
- **Sensor hook lifecycle** — `useFoodCamera()` in `src/hooks/use-food-camera.ts` models the template: a `CameraStatus` state machine (`idle | starting | active | denied | unavailable`), `start()`/`stop()`, capability check (`navigator.mediaDevices?.getUserMedia`), **stop-on-hidden** (`document.hidden` guard in `captureFrame`), and full cleanup in a `useEffect` return (tracks stopped, interval cleared). Sibling hooks `use-barcode-scan.ts` and `use-food-voice-session.ts` follow it.
- **Source-degradation ladder** — `resolveBarcode()` in `src/domain/food-lookup.ts` degrades **cache → seed → OpenFoodFacts → USDA FDC (if key) → not found**, with per-source timeouts (`AbortSignal.timeout`) and graceful `null` on failure.

**Why it recurs.** New device inputs appear across specs: a **Bluetooth weight scale / BP cuff** (spec 02 P1), a **glucometer** (spec 05), and voice as an input channel (spec 07). Each spec would otherwise re-invent permission handling, cleanup, and offline fallback. The specs also (correctly) note that consuming a Bluetooth device signal pushes toward SaMD (F5) and that RPM CPT billing needs ≥16 device-transmission days (spec 02) — so the hook must record transmission provenance, not just values.

**Target state.** A documented "new sensor hook" template and a "new lookup ladder" template, so device features reuse the state machine, stop-on-hidden, cleanup, and seed→live→manual degradation instead of re-deriving them. Manual entry is always the terminal fallback (works with zero hardware), and each reading records its source (`device` vs `manual`) for both provenance (F5) and RPM billing-day counting (spec 02).

**Concrete tasks.**
- [ ] Document the sensor-hook template (status machine, capability check, stop-on-hidden, cleanup) in this doc, citing `use-food-camera.ts` as the reference implementation.
- [ ] Document the degradation-ladder template (cache → seed → live source(s) → manual) citing `food-lookup.ts`.
- [ ] Define a shared reading-source tag (`"device" | "manual" | "imported"`) to attach to any sensor-sourced value, feeding F5 provenance and spec-02 RPM day counting.
- [ ] Note the SaMD implication (F5): a device-signal-driven recommendation needs the F5 regulatory read before it ships.

**Depended on by.** 02 (blocking for P1 devices — pattern + source tag), 05 (blocking for glucometer), 07 (helpful — voice input hook follows the same lifecycle); Food Lens (already conforms — reference implementation).

**Sequencing.** Documentation is P0 (no code cost); per-device hooks land in each feature's device P-phase, gated by F5 for the SaMD read.

---

### F8 — Care-team return channel (one-way → closed-loop signal)

**Current state.** Care-team messaging is **one-way**: the patient can draft a message (`src/domain/care-team-message.ts`) and the gate offers `call_clinic` / `draft_message` actions, but there is **no return signal** — no clinician confirm/close, no acknowledgement, no EHR read-back. There is no care-team entity at all; clinic contact is just `primaryClinicName` / `primaryClinicPhone` on `PatientProfile`.

**Why it recurs.** The specs' **primary outcome metrics are unmeasurable** without a return channel: spec 01 (screening completion, new diagnoses, care-team **rejection rate**), spec 03 (referral **loop closure / terminal outcome**), spec 05 (cohort outcomes), spec 06 (referral close). Without a clinician-side confirm/close surface or EHR read-back, v1 can only report self-reported proxies — and spec 03's "closed-loop" label is false if no human ever closes the loop.

**Target state.** A minimal clinician-side **acknowledge / disposition / close** surface (built on F1 backend + F3 actor-bearing audit), producing a return event that flips a patient-side referral/alert to a terminal state. Named human owner (CHW/coordinator) is a hard onboarding requirement (spec 03) — clinics without one are not onboarded.

**Concrete tasks.**
- [ ] Define a `CareTeamResponse` / disposition event type (references F3 `actor` + action verbs like `referral_closed`, `acknowledged`).
- [ ] Add the clinician confirm/close surface (gated on F1 + F3).
- [ ] Model referral/alert lifecycle states (open → in-progress → closed/terminal) so metrics are measurable.
- [ ] Require a named human owner per clinic at onboarding (spec 03 dependency).

**Depended on by.** 03 (blocking — loop closure is the feature), 06 (blocking — referral close), 01 (blocking for real outcome metrics), 05 (blocking for cohort outcome metrics); 02/04 (helpful — disposition return).

**Sequencing.** P1/P2 (depends on F1 + F3). Metrics that need it are explicitly deferred to a post-backend phase across the specs.

---

### F9 — i18n EN/ES parity CI gate

**Current state.** A parity primitive already exists but is **narrow**. `src/i18n/strings.ts` defines `FoodLensStringKey` and `foodLensStrings: Record<Language, Record<FoodLensStringKey, string>>` for en/es, with a `t()` interpolator. The parity test in `src/i18n/strings.test.ts` (lines 20–26) asserts es and en define the same key set — **but only for `foodLensStrings`**. New patient-facing surfaces (risk explanations, SDOH screening, crisis copy, chronic-loop coaching, voice prompts) have no string catalog and no parity coverage yet.

**Why it recurs.** Every patient-facing feature adds copy, and spec 07 (access/equity) makes EN/ES parity release-blocking. Crisis copy (F4) and threshold/urgency phrasing (F5, spec 07) must exist in Spanish and must not soften urgency tier in translation (spec 07 risk).

**Target state.** A general string-catalog + parity convention: each patient-facing surface owns a typed key union and an `en`/`es` record, and a **single CI parity test** iterates all catalogs asserting key-set equality (extending the existing test beyond `foodLensStrings`). New keys are ES-complete or CI fails.

**Concrete tasks.**
- [ ] Generalize `strings.ts` to register multiple catalogs (or add sibling catalogs) with a shared `Record<Language, Record<K, string>>` shape.
- [ ] Extend `src/i18n/strings.test.ts` (lines 20–26) into a loop over **all** registered catalogs, not just `foodLensStrings`, so every surface's ES parity is gated.
- [ ] Wire the parity test into `npm run check` so it blocks builds (it already runs under Vitest).
- [ ] Add crisis/urgency copy keys (F4) with ES translations that preserve urgency tier.

**Depended on by.** 07 (blocking — EN/ES parity is release-blocking), 03 (blocking — SDOH screening copy), 04 (blocking — crisis copy in ES); 01, 05 (helpful — patient-facing explanations).

**Sequencing.** Test generalization is P0 (cheap). Per-feature catalogs land with each feature; the gate ensures none regress.

---

### F10 — Licensed clinical rule/dataset registry (Beers/STOPP, interactions, risk equations, thresholds)

**Current state.** Clinical constants are **inline and unversioned**: BP bands live as literals in `src/domain/safety.ts` (`hasDangerousBloodPressure`: ≥180/≥120, <90/<60); nutrient limits/med-diet rules are hard-coded in `src/domain/condition-lens.ts` (e.g., sodium 1500 mg, the ACE/ARB potassium `medDietRules`). There is **no dataset registry, no version, no date, no named owner, no citation** attached to any clinical rule.

**Why it recurs.** Spec 05 (deprescribing) needs Beers/STOPP + a drug-interaction table; spec 01 needs PCE/FRAX/ADA/USPSTF; spec 02/06 need HF thresholds and duplicate-med detection. The specs flag that an **unlicensed, stale, or non-exhaustive** ruleset is a duty-to-act liability and patient-safety hazard — it needs a licensed, versioned, dated dataset with a named owner and legal/clinical sign-off before reaching patients. This is also the concrete backing for F5's `SourceCitation`.

**Target state.** A small **rule/dataset registry** convention: each clinical dataset (risk equation coefficients, Beers/STOPP list, interaction table, threshold band) is stored with `name, version, effectiveDate, source/license, owner`, surfaced via F5's `SourceCitation`, and gated behind licensing + clinical sign-off. Existing inline constants (BP bands, nutrient limits) are migrated into the registry so provenance is uniform.

**Concrete tasks.**
- [ ] Define the registry entry shape (`name, version, effectiveDate, license, owner, citation`) and a home for it in `src/domain/` (e.g. `clinical-datasets.ts`).
- [ ] Migrate the inline BP bands (`safety.ts`) and nutrient/med-diet rules (`condition-lens.ts`) into registry-backed, cited entries.
- [ ] For each feature's dataset (PCE/FRAX/ADA/USPSTF for 01; Beers/STOPP + interactions for 05; HF thresholds for 02/06): record license, version, date, owner; get clinical + legal sign-off before patient exposure.
- [ ] Wire registry citations into F5's provenance UI so every clinical number shows source + version.

**Depended on by.** 05 (blocking — Beers/STOPP + interactions), 01 (blocking — risk equation datasets); 02, 06 (blocking — HF thresholds / duplicate detection); 03 (helpful — resource eligibility rules).

**Sequencing.** Registry shape is P0 (cheap, pairs with F5). Per-dataset licensing/sign-off is long-lead and gates each feature's clinical-rule P-phase.

---

## Dependency Matrix

Legend: **B** = blocking (feature cannot ship the relevant slice without it) · **H** = helpful (feature is better/measurable with it but can ship a degraded slice) · blank = not needed.

| Feature | F1 Backend | F2 Demographics | F3 Audit actor | F4 Crisis gate | F5 Reg/provenance | F6 Condition union | F7 Sensor hook | F8 Return channel | F9 i18n parity | F10 Dataset registry |
|---|---|---|---|---|---|---|---|---|---|---|
| **01 Early Detection** | H | **B** | H | **B** | **B** | | | **B** | H | **B** |
| **02 Between-Visit Monitoring (HF)** | **B** | | **B** | H | **B** | **B** | **B** | H | | **B** |
| **03 SDOH / Food-is-Medicine** | **B** | | H | **B** | **B** | H | | **B** | **B** | H |
| **04 Behavioral Health / Crisis** | **B** | H | **B** | **B** | **B** | | | H | **B** | |
| **05 Chronic Loops / Deprescribing** | **B** | H | H | H | **B** | **B** | **B** | **B** | H | **B** |
| **06 Care Coordination** | **B** | | **B** | | **B** | **B** | | **B** | | **B** |
| **07 Access / Equity (Voice, ES)** | **B** | | | **B** | **B** | | H | | **B** | |

---

## Suggested Global Build Order

**Phase 0 — Long-lead + cheap type changes (start everything in parallel).**
1. **Kick off long-lead reads immediately:** F1 (backend/BAA architecture + counsel) and F5 (regulatory-posture doc + counsel) — these gate the most features and take the longest.
2. **Land the cheap, self-contained type changes now** (unblock scoping + fixtures): **F2** (demographics), **F3** (audit actor + action union), **F9** (parity-test generalization), and publish the **F6** condition-checklist and **F7** sensor/degradation templates as docs.
3. **Track `task_e569880c` (F4)** to merge; on merge, rewrite F4 to the as-built shape (action string, `CRISIS_ACTIONS`, gate ordering, realtime gating) — this unblocks all crisis-touching work.
4. Define **F10** registry shape + **F5** `SourceCitation` together (they pair).

**Phase 1 — Patient-facing, local-first features that don't need the backend.**
5. **07 Access/Equity** patient slices (voice/ES) — needs F4 (crisis gate, merged) + F5 + F9; runs local-first, so not blocked on F1.
6. **01 Early Detection** engine + patient-facing risk display — needs F2 + F5 + F10 (datasets) + F4 (depression path); care-team metrics deferred to F8.
7. **03 SDOH** non-behavioral referral slice — needs F5 + F9; the SI/mood/IPV items stay gated behind F4 (already merged) + F8 + legal sign-off.

**Phase 2 — Clinician-facing / multi-patient features (hard-gated on F1 + F3).**
8. **04 Behavioral Health** review queue — needs F1 + F3 + F4 (all landed) + F9.
9. **02 Between-Visit Monitoring** worklist + HF — needs F1 + F3 + F5 + F6 (heart_failure) + F7 (devices, P1) + F10 (HF thresholds).
10. **06 Care Coordination** queue — needs F1 + F3 + F5 + F6 + F8 + F10.
11. **05 Chronic Loops / Deprescribing** — needs F1 + F5 + F6 (populated lenses) + F7 (glucometer) + F8 + F10 (Beers/STOPP); titration held behind F5's formal read (FR-15).

**Cross-cutting gates that never move:** no clinician/multi-patient feature reaches real PHI before **F1 + F3**; no "recommending" surface reaches patients before its **F5** legal hold clears; no crisis/SI/IPV/voice slice ships before **F4** (`task_e569880c`) merges with its ordering test green.
