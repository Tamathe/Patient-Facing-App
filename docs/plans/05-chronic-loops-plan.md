# Implementation Plan — Chronic-Disease Self-Management Loops + Deprescribing & Cost

**Spec:** `docs/specs/05-chronic-loops.md`
**Foundations:** `docs/plans/00-foundations.md`

> **Reviewer's note (staff eng).** The draft was verified against live source and holds up unusually well — nearly every symbol and line reference is correct. This FINAL version keeps that rigor and fixes the real defects found on re-verification: (a) a muddled safety branch-order claim, (b) an under-specified storage-migration approach that ignores the actual `PersistedAppState` / sanitize architecture, (c) two scope-honesty leaks where "P0" tasks quietly assume P1 types or UI, (d) sequencing corrections, and (e) concrete named tests for the safety-critical paths. Corrections are flagged **[FIX]** inline.

---

## Foundations Dependencies (per the Dependency-Matrix row for feature 05)

- **F5 (Reg/provenance) — BLOCKING for the "recommending" surfaces.** The deprescribing worklist and cost table are the first surfaces here that read as clinical recommendations. They must not reach patients before F5's `regulatory-posture-design-spec.md` classifies them and legal/clinical copy review clears the framing (FR-15). P0 output is drafted questions only (designed to stay non-device-CDS), but the copy-review gate still applies. Consume F5's `SourceCitation` shape to stamp the seeded tables.
- **F10 (Dataset registry) — BLOCKING for Beers/STOPP + interactions + cost table.** Store the ruleset and cost table as registry-backed, versioned, dated, cited entries (`name, version, effectiveDate, license, owner, citation`), never inline literals. P0 ships a *seeded* table under the registry shape with a visible "not exhaustive; defers to your pharmacist" disclaimer; a licensed dataset with sign-off is the P1 swap.
- **F6 (Condition union) — BLOCKING for populated lenses.** P0 fills the stub `diabetesLens` (`src/domain/condition-lens.ts:121`, currently `nutrientRules: []`/`medDietRules: []`). The diabetes *loop* is P1; the P2 COPD loop needs `Condition` extended with `"copd"` per F6's checklist (union `types.ts:19` + `isCarePlan` guard `storage.ts:366-382` + `selectLens` `condition-lens.ts:139-149` + real lens + fixtures).
- **F7 (Sensor hook) — BLOCKING for glucometer (P1 only).** Manual glucose entry (P1) is the terminal fallback of F7's ladder; BLE glucometer reuses F7's hook template + `"device"|"manual"|"imported"` source tag. **P0 uses only the existing manual `HomeReading` path and needs no new sensor hook** — so F7 is *not* a P0 dependency for this feature. **[FIX]** the foundations matrix marks F7 "B" for 05; that blocking status applies to the **P1 glucometer slice**, not P0. Make that explicit so P0 is not falsely gated.
- **F8 (Return channel) / F1 (Backend) — BLOCKING for cohort/outcome metrics + clinician write-back only (P2).** P0/P1 ship patient-owned export, no write-back. Leading on-device metrics need neither.
- **F2 (Demographics) — HELPFUL.** Age gates some Beers criteria. If F2 landed, read `dateOfBirth`/`ageFromDob`; else emit an explicit "age unknown — could not evaluate this age condition" candidate (never silently skip or silently apply).
- **F3 (Audit actor) — HELPFUL.** New reducer actions record audit events. **[FIX]** F3 extends `recordAuditEvent()` to take an `actor`. Today the signature is `recordAuditEvent(patientId, action, label)` (`audit.ts:3`). If F3 has landed, pass the actor; if not, use the 3-arg signature. Either way the call is *inline in each reducer case* — do not assume automatic auditing.
- **F4 (Crisis gate) — HELPFUL for P0, BLOCKING for the P1 hypo/hyper slice.** P0 has no crisis-class hazard. The P1 diabetes hypo/hyper deterministic thresholds must sit **below** the crisis branch per F4's tier convention and **must import the exported action constants from `safety-gate.ts` rather than hard-coding `["call_clinic","draft_message"]`.** **[FIX]** `CARE_TEAM_ACTIONS` is currently a **module-private** `const` (`safety-gate.ts:7`, not exported). P1 depends on `task_e569880c` exporting it (or a `CRISIS_ACTIONS` sibling). Do not assume it is importable today.
- **F9 (i18n parity) — HELPFUL.** New EN/ES strings. If F9's multi-catalog generalization has not landed, interim-extend `foodLensStrings` and its parity test (`src/i18n/strings.test.ts:20-26`), flagged for migration.

---

## 1. Objective & P0 Definition of Done

**P0 thin slice:** Generalize the medication-adherence primitives into a reusable `SelfManagementLoop` engine, instantiate the **hypertension monitoring loop** end-to-end on the existing localStorage prototype, and ship **deprescribing worklist v1** and **cost transparency v1** as drafted-questions-only surfaces backed by seeded, dated, cited tables. Everything routes through the existing `createSafeAiResponse()` gate and reuses the banner + `call_clinic`/`draft_message` actions verbatim. **No titration prompt. No glucose ingestion. No new backend. Single-user.**

**P0 Definition of Done:**

1. `SelfManagementLoop<E>` engine in `src/domain/self-management-loop.ts` (event stream → interpret → prompt → streak/rate → escalation). The existing `getAdherenceStreak`/`getAdherenceRate` (`adherence.ts:27,44`, `medicationId`-keyed) are re-expressed through it (engine wraps, does not delete them) with **all current `src/domain/adherence.test.ts` cases green unchanged.**
2. Hypertension monitoring loop computes a **rolling home-BP average (systolic AND diastolic)** over a configured window vs. the goal band (`carePlan.callThresholdSystolic/Diastolic`, or a documented standard-education band when null, labeled as such). When the average is outside goal for the configured count, it surfaces a plain-language observation and drafts a care-team message via the parameterized `buildCareTeamMessage()`/`draft_message` path. Never emits a dose instruction; never proposes a titration step. **[FIX]** This is *new* math: `summarizeBpTrend` (`adherence.ts:70`) is systolic-only, split-half, `MIN_TREND_READINGS = 5`. Leave `summarizeBpTrend` untouched to protect its tests; add new functions alongside.
3. Any single reading ≥180/120 or <90/60 still **hard-escalates first** via the unchanged `decideSafety()` path. **[FIX] Accurate branch statement:** in `decideSafety()` (`safety-gate.ts:39`) the **stored-reading / dangerous-vitals branch (`recentClinicalReading`, lines 48–70) runs before the latest-reading-note branch (72–82), which runs before the free-text `inputSafety` branch (84–86).** The draft's phrasing ("stored-vitals lines 48–86 run before free-text input at line 84") is self-contradictory (84 is inside 48–86) and must be replaced with this ordering. The loop observation is at most `soft_escalate` and cannot pre-empt any of these.
4. Deprescribing module (`src/domain/deprescribing.ts`) evaluates the **full** `state.medications` list against a seeded, versioned, dated interaction + Beers/STOPP-style ruleset; every candidate is `needs_review`, phrased as a question, with a visible "not exhaustive; defers to your pharmacist" disclaimer. Output is a patient-owned draft iterating the whole list.
5. Cost module (`src/domain/cost-transparency.ts`) surfaces, for a med with a `cost` barrier (existing `MedicationBarrier`, `types.ts:38`), an estimated cash price + generic/therapeutic-class alternatives from a seeded, dated table, each labeled "estimate, not your guaranteed price" with source + date, and drafts a care-team message. No prescription state mutates.
6. `diabetesLens` filled with real `nutrientRules` (`carbsG`, `addedSugarsG`, `fiberG`) + glucose-med `medDietRules` using the existing `NutrientRule`/`MedDietRule` mechanism. `condition-lens.test.ts` + `food-flags.test.ts` extended and green; hypertension lens behavior unchanged.
7. Teach-back v1 (extension of `explain`): restate → confirm/correct logic, EN/ES.
8. `buildHealthBrief()` (`health-brief.ts:7`, a fixed six-section array) gains loop-summary, deprescribing-worklist, and cost-flag sections, each carrying an `EvidenceStatus`.
9. New data serializes, validates on load, survives a reload, and is exportable/printable/deletable/resettable through the privacy surface (FR-12).
10. All new patient-facing copy has EN + ES keys; parity test green; **no urgency-tier softening in ES.**
11. `npm run check` (= `lint && test && build`, per `package.json`) is green.

**Explicitly NOT in P0:** glucose ingestion + hypo/hyper numeric thresholds, full diabetes loop, titration prompt, COPD/asthma loop, live price source, licensed interaction dataset, clinician write-back, BLE devices, cohort metrics, realtime-voice teach-back.

---

## 2. Prerequisites & Dependencies

**Blocking for P0 patient exposure (not for development):**
- **F5 copy-review gate + F10 registry shape.** The seeded ruleset + cost table are the first recommending-adjacent surfaces. Store under F10's registry entry shape and clear F5's legal/clinical copy review before patient exposure (FR-15). *Engine code builds and tests against a seeded fixture in parallel; the gate blocks exposure, not development.*
- **A seeded, dated ruleset + cost table with provenance + a named owner.** A content/legal dependency, not just code. The "not exhaustive" disclaimer must be visible.

**Deferrable (P1+):** F2 (helpful for age-conditioned Beers); F4 `task_e569880c` (only for the P1 hypo/hyper slice — **do not start it until that task merges with a green ordering test and exports its action constants**); F7 (P1 glucometer); F1 + F8 (P2 cohort metrics / write-back); F9 multi-catalog generalization (interim-extend `foodLensStrings`).

**External:** licensed drug-interaction + Beers/STOPP dataset (P1 swap, long-lead); licensed live cash-price source (P1 swap, GoodRx-style terms); clinician goal/protocol-authoring surface (hard prerequisite for any P1 titration, alongside F5's regulatory read).

**Devices:** none blocking for P0 (patient-entered BP only).

---

## 3. Architecture & Approach

**Design principle: deterministic-first "nurse layer."** Every threshold, band, interaction rule, streak/rate, and escalation decision is a pure function in `src/domain/` and runs **before** any model call. The model only adds plain-language explanation *after* the deterministic layer decides. The model never gates or overrides an escalation.

### New modules (`src/`)
- **`src/domain/self-management-loop.ts`** — generic engine over an event type `E`:
  ```
  interpret(events: E[], config): LoopInterpretation
  nextPrompt(interpretation): LoopPrompt
  metrics(events: E[], today): { streak: number; rate: { of: number; done: number } }
  escalation(interpretation): "none" | "soft" | "hard"
  ```
  Lifts the shared adherence/BP-trend shape. `getAdherenceStreak`/`getAdherenceRate` become the medication instance's `metrics()`; the engine wraps (never deletes) them so `adherence.test.ts` stays green.
- **`src/domain/loops/hypertension-monitoring.ts`** — first *new* instance. `computeHomeBpAverage(readings, windowDays)` (systolic AND diastolic) + `isOutsideGoalForReadings(readings, goal, count)`. Escalation output is `"soft"` at most; the `"hard"` path stays owned by the existing `decideSafety()` numeric branch, never duplicated here.
- **`src/domain/deprescribing.ts`** — `buildDeprescribingWorklist(state, ruleset): DeprescribeCandidate[]`, pure/offline/deterministic. Each candidate `{ id, kind: "interaction"|"beers"|"no_longer_indicated", medicationIds, question, evidence: "needs_review", citation: SourceCitation }`.
- **`src/domain/cost-transparency.ts`** — `buildCostFlags(state, costTable): CostFlag[]`, pure/offline.
- **`src/domain/clinical-datasets.ts`** — F10 registry home (seed it if F10 hasn't). Holds the seeded interaction/Beers ruleset + cost table as versioned/dated/cited entries. Defines/re-exports `SourceCitation` (confirmed **not present anywhere in `src/` today**).
- **`src/domain/loops/teach-back.ts`** — deterministic teach-back state helpers (which prompt, whether a restatement "matches"). LLM rephrasing is Haiku; the *satisfied/not-satisfied decision* is deterministic.

### Existing modules to extend (verified symbols)
- **`src/domain/types.ts`** — add `GlucoseReading`, `ActivityEvent`, `SymptomCheckIn`, `RescueUseEvent`, `DeprescribeCandidate`, `CostFlag`, `CostAlternative`, `SourceCitation`; extend `AppState` (`types.ts:181`) with `deprescribeCandidates` and `costFlags` **for P0**. **[FIX / scope]** `glucoseReadings` and `activityEvents` are P1 event streams — define the *types* in P0 for serialization stability, but **only add the `AppState` arrays you actually read in P0.** Adding four arrays in P0 when two are inert is dead state that the storage guards, fixtures, export, and delete all must carry with no P0 behavior. Recommended P0: add `deprescribeCandidates: DeprescribeCandidate[]` + `costFlags: CostFlag[]` to `AppState`; hold `glucoseReadings`/`activityEvents` until P1-1. (If you prefer one migration, add all four and cover them in tests — but then they are P0 DoD items, not "defined for stability.")
- **`src/domain/condition-lens.ts`** — fill `diabetesLens` (lines 121–128) `nutrientRules`/`medDietRules`. Reuse `NutrientRule`/`MedDietRule`; no new mechanism. **[Note]** `MedDietRule.patternFlagKey`/`nutrientFlagKey` are typed `FoodLensStringKey`, so any new diabetes flags must be added to the `foodLensStrings` union (P0-18 dependency, not optional).
- **`src/domain/care-team-message.ts`** — `buildCareTeamMessage(state)` reads only `state.medications[0]` (line 19) and formats `systolic/diastolic`. Parameterize to `buildCareTeamMessage(state, options?: { kind: "general"|"deprescribing"|"cost"|"bp_trend"; medicationId?; candidates?; flags? })`. **Default `kind: "general"` output MUST stay byte-identical** so `care-team-message.test.ts` stays green (add cases for new kinds).
- **`src/domain/health-brief.ts`** — append three sections to the six-section array (`health-brief.ts:61-96`), each with an `EvidenceStatus` (`needs_review` for deprescribing; `patient_reported` for loop summaries). Extend `health-brief.test.ts`.
- **`src/ai/intent.ts`** — **[FIX]** `inferAiMode()` only ever returns `explain/why/visit/ask/trouble` and defaults to `explain` when the current mode is already `explain` (it early-returns `currentMode` otherwise, `intent.ts:6-7`). The full `AiMode` union (`types.ts:100`) is larger (`today`, `summarize`, `food`). Do **not** add `teach-back` to the free-text inference heuristics — teach-back must only be entered from an explicit confirm-understanding flow, never inferred from typed text (see Risks). Add `"teach-back"` to the `AiMode` union and route to it explicitly from the teach-back UI/reducer, not from `inferAiMode`.
- **`src/ai/mock-provider.ts`** — **[FIX]** `MockHealthAiProvider.respond()` special-cases only `food` (line 72), `why` (80), `visit` (99), plus a generic default (108). It does **not** branch on `explain`/`today`/`ask`/`trouble`/`summarize`. Add explicit branches for the new `teach-back` mode and for the loop-summary/deprescribing-framing/cost-framing rendering so the whole feature runs offline with `HEALTH_AI_PROVIDER=mock` (the default). Follow the `request.mode === "food"` shape at line 72.
- **`src/state/store.tsx`** — add reducer actions (Section 5). Every case appends `recordAuditEvent(state.patient.id, action, label)` inline (confirmed pattern: `addReading` line 46, `logDose` line 118, etc. — there is **also** a passthrough `addAuditEvent` case at line 82, but new mutations should audit inline like every other case, not route through it).
- **`src/state/storage.ts`** — **[FIX — this is the biggest under-specification in the draft].** The migration is not "add a backfill line + a sanitize pass." The real architecture:
  - `PersistedAppState` is `Omit<AppState, "tasks"|"mealLog"|"doseEvents"> & { tasks: unknown; mealLog: unknown; doseEvents: unknown }` (line 396). Only those three fields are loosely typed and sanitized post-parse; **every other array is validated strictly by `isValidCoreAppState` (429) and will cause the whole state to be discarded if malformed or missing.**
  - Therefore new arrays you add to `AppState` must be handled in **one of two ways**, and the plan must pick one:
    - **(A) Strict-validated core arrays** (recommended for `deprescribeCandidates`/`costFlags`): add guards `isDeprescribeCandidate`/`isCostFlag`/`isCostAlternative`/`isSourceCitation`, add them to the `isValidCoreAppState` array checks (442–451), **and** add `parsed.deprescribeCandidates === undefined → []` / `parsed.costFlags === undefined → []` backfill branches (mirroring lines 484–489) so pre-feature states upgrade instead of being wiped. Because these are validated strictly, a malformed entry discards the whole state — acceptable for small internal-only arrays.
    - **(B) Sanitized loose arrays** (use only if you want malformed entries dropped rather than the whole state discarded — e.g. for larger patient-entered event streams like glucose/activity in P1): move them into the `PersistedAppState` Omit + `unknown` group, add a `sanitize*` pass (like `sanitizeDoseEvents`, 418) that also drops cross-patient/orphaned entries, and validate in `isValidAppState` (456).
  - Also extend `hasValidRelationships` (83) if new entries carry a `patientId` (cross-patient rejection), and `getKnownSourceIds` (60) if any new ID can be an AI-message source.
- **`src/i18n/strings.ts`** + `strings.test.ts` — new EN/ES keys under an F9 catalog, or interim-extend `foodLensStrings` (`strings.test.ts:20-26` parity test).
- **`src/ai/safety-gate.ts` / `src/domain/safety.ts`** — **P1 only:** add the unit-aware structured glucose hypo/hyper classifier (new numeric classifier, **not** a regex line in `classifySafety`) below the crisis branch. P0 touches neither beyond a regression test proving the existing hard-escalate still fires first.

### Data flow (P0 hypertension monitoring loop)
1. Patient logs a `HomeReading` (existing numbers page → `addReading`).
2. On the loop surface, `hypertension-monitoring.ts` computes the rolling average vs. goal band (deterministic).
3. If a single recent reading is dangerous, the existing `decideSafety()` → `findRecentClinicalReading()` hard-escalate fires first (unchanged).
4. Otherwise, if the average is outside goal for N readings, the loop produces a plain-language observation; the coach renders it (Haiku for the "why"); it offers `draft_message` → `buildCareTeamMessage(state, { kind: "bp_trend" })`.
5. All of it flows through `createSafeAiResponse()`; the banner + care-team actions are reused verbatim.

---

## 4. Work Breakdown (sequenced)

### Milestone P0-A — Loop engine + data model foundation
- [ ] **P0-1 — New domain types.** Add `DeprescribeCandidate`, `CostFlag`, `CostAlternative`, `SourceCitation`; extend `AppState` with `deprescribeCandidates`, `costFlags`. Define `GlucoseReading`/`ActivityEvent`/`SymptomCheckIn`/`RescueUseEvent` types (P1/P2 event streams) but **do not** add their `AppState` arrays yet (see §3 [FIX]). *File:* `src/domain/types.ts`. *Accept:* compiles; `SourceCitation` = `{ name; version; effectiveDate; source; url? }`; no P1 array added to `AppState`.
- [ ] **P0-2 — `SelfManagementLoop` engine.** Generic interface + a `medicationAdherenceLoop` delegating to existing adherence fns. *Files:* create `self-management-loop.ts`; touch `adherence.ts` only to export (remove nothing). *Accept:* new `self-management-loop.test.ts` green; **`adherence.test.ts` unchanged and green.**
- [ ] **P0-3 — Storage guards + migration.** Per §3 [FIX] option (A): add `isDeprescribeCandidate`/`isCostFlag`/`isCostAlternative`/`isSourceCitation`; add both arrays to `isValidCoreAppState`; add `undefined→[]` backfill branches (mirror 484–489); extend `hasValidRelationships` for the `patientId` on candidates/flags. *Files:* `storage.ts`, `storage.test.ts`. *Accept:* a pre-feature persisted state loads and upgrades (not discarded); a malformed candidate is handled per the chosen validation mode; cross-patient candidate rejected.
- [ ] **P0-4 — Fixtures.** Add the two new arrays to `demoState` (3), `deletedDemoState` (110), `brentState` (143). Seed `demoState` with an **out-of-goal BP history + a polypharmacy med list (incl. an ACE-inhibitor + a potassium-sparing/Beers-listed med)** so P0 surfaces render. *File:* `fixtures.ts`. *Accept:* app boots; `resetDemo`/`deleteDemoData` valid against guards.

### Milestone P0-B — Hypertension monitoring loop (end-to-end)
- [ ] **P0-5 — Rolling BP average + goal-band logic.** `computeHomeBpAverage(readings, windowDays)` (SBP+DBP) + `isOutsideGoalForReadings(...)`. *Files:* create `loops/hypertension-monitoring.ts` + test. *Accept:* tests cover: `<N` readings → no observation; within goal → no draft; outside goal for N → observation object; null goal → standard-education fallback labeled as such; **never returns `"hard"` or a dose imperative.**
- [ ] **P0-6 — Wire loop into the coach/Today surface.** Surface observation + `draft_message` through `createSafeAiResponse()`; render banner + care-team actions on soft-escalate; add the mock loop-summary response. *Files:* the relevant page (`src/app/today/page.tsx` or `src/app/chat/page.tsx` — confirm which renders coach output), `mock-provider.ts`. *Accept:* with the out-of-goal fixture the UI shows the observation + "message my care team"; with a dangerous single reading the existing hard-escalate pre-empts it.
- [ ] **P0-7 — Regression: dangerous single reading hard-escalates first.** *File:* extend `safety-gate.test.ts`. *Accept:* a state with a 182/122 stored reading + an out-of-goal average returns `hard_escalate` (loop cannot demote it); **assert the branch ordering explicitly** (stored-reading branch pre-empts the soft loop path).

### Milestone P0-C — Deprescribing worklist v1
- [ ] **P0-8 — Seed the ruleset under the registry.** Seeded, versioned, dated interaction + Beers/STOPP entries with `SourceCitation` + named owner; export the "not exhaustive; defers to your pharmacist" disclaimer string. *File:* create `clinical-datasets.ts`. *Accept:* each entry carries name/version/effectiveDate/source/owner; disclaimer exported.
- [ ] **P0-9 — Deprescribing engine over the full med list.** `buildDeprescribingWorklist(state, ruleset)`; every candidate `needs_review`, phrased as a question; age-conditioned Beers rules read F2 `ageFromDob` if present, else emit an explicit "age unknown — could not evaluate" candidate. *Files:* create `deprescribing.ts` + test. *Accept:* the ACE-inhibitor + potassium-sparing (or Beers-listed) fixture yields interaction/Beers candidates; single-med patient yields none; **output contains no imperative verb** (assert against `/\b(stop|reduce|increase|start|change|switch)\b/i`).
- [ ] **P0-10 — Parameterize `buildCareTeamMessage`.** Add `kind`; deprescribing bundles all candidates into one draft. *Files:* `care-team-message.ts`, `care-team-message.test.ts`. *Accept:* default `kind: "general"` **byte-identical** to today (existing test green, unmodified); `kind: "deprescribing"` lists every candidate as a question.
- [ ] **P0-11 — Deprescribing reducer action + audit + UI.** `flagDeprescribeCandidate` action (audit `"created"`, "Deprescribing question flagged"); surface the worklist + draft; patient-owned export only. *Files:* `store.tsx`, a deprescribing surface (under `src/app/visits/` or new). *Accept:* flagging dispatches `recordAuditEvent()`; worklist renders `needs_review` badges + disclaimer; **"should I stop this?" hits the existing medication-change soft-block** (verify against `safety-dose-change.test.ts` — the `medicationChangePatterns` in `safety.ts:6-20` already cover "stop … medicine/medication/pill/dose", FR-7 reuse).

### Milestone P0-D — Cost transparency v1
- [ ] **P0-12 — Seed the cost table under the registry.** Estimated cash prices + generic/therapeutic-class alternatives, dated/sourced; "estimate, not your guaranteed price" label. *File:* extend `clinical-datasets.ts`. *Accept:* entries carry price + alternatives + source + date + estimate label.
- [ ] **P0-13 — Cost engine + draft.** `buildCostFlags(state, costTable)` for meds with a `cost` barrier; draft via `buildCareTeamMessage(state, { kind: "cost", medicationId })`. *Files:* create `cost-transparency.ts` + test. *Accept:* a `cost`-barrier med produces a flag with alternatives + estimate label; no prescription mutates; draft says "please review," never "switch to this."
- [ ] **P0-14 — Cost reducer action + audit + UI.** `flagCostBarrier` action (audit `"created"`); surface estimate + alternatives + draft. *Files:* `store.tsx`, medicines/coach surface. *Accept:* flagging dispatches `recordAuditEvent()`; UI shows estimate label + source/date.

### Milestone P0-E — diabetesLens, teach-back, brief/export, i18n
- [ ] **P0-15 — Fill `diabetesLens`.** Real `nutrientRules` (`carbsG`, `addedSugarsG`, `fiberG`) + glucose-med `medDietRules`; add any new flag keys to `foodLensStrings` (required by the `FoodLensStringKey` type). *Files:* `condition-lens.ts`, `condition-lens.test.ts`, `food-flags.test.ts`, `strings.ts`. *Accept:* a diabetic fixture running a high-carb food through `food-flags.ts` produces carb/added-sugar flags; hypertension lens unchanged.
- [ ] **P0-16 — Teach-back v1.** Add `"teach-back"` to `AiMode` (`types.ts:100`); deterministic teach-back helpers; Haiku rephrasing in mock + live; **update `isAiMode` guard (`storage.ts:188-199`) to accept `"teach-back"`** so messages persist. Enter teach-back only from an explicit flow, **not** from `inferAiMode`. *Files:* `types.ts`, `intent.ts` (no new inference), `mock-provider.ts`, create `loops/teach-back.ts` + test, `storage.ts`. *Accept:* explain flow can enter teach-back (restate → confirm/correct); persisted teach-back messages reload; EN/ES prompts present.
- [ ] **P0-17 — Extend `buildHealthBrief`.** Add loop-summary, deprescribing-worklist, cost-flag sections with `EvidenceStatus`. *Files:* `health-brief.ts`, `health-brief.test.ts`. *Accept:* three new sections present; deprescribing section `needs_review`; export/print include them.
- [ ] **P0-18 — i18n EN/ES keys + parity.** All new patient-facing strings; register under F9 or interim-extend `foodLensStrings`. *Files:* `strings.ts`, `strings.test.ts`. *Accept:* every new key has EN + ES; parity test green; **no urgency-tier softening in ES** (add a targeted assertion for any escalation/urgency string).
- [ ] **P0-19 — Privacy-surface coverage.** Confirm export/print/delete/reset include `deprescribeCandidates` + `costFlags`. *Files:* verify `src/app/privacy/page.tsx` + export logic; extend a privacy test if present. *Accept:* export JSON contains the new arrays; `deleteDemoData`/`resetDemo` clear/restore them; no new type is export-exempt (FR-12).
- [ ] **P0-20 — Green `npm run check`.** *Accept:* clean `lint && test && build`; no `any`; no new lint errors.

### Milestone P1 (summary — full diabetes loop + titration + live data)
- [ ] **P1-1 — Structured glucose ingestion (unit-forced).** Now add `glucoseReadings`/`activityEvents` to `AppState` + storage (per §3, likely option (B) sanitized). Glucose entry forces mg/dL vs mmol/L (FR-10). `logGlucose`/`logActivity` reducer actions + audit. *Depends: F7 manual-entry fallback.*
- [ ] **P1-2 — Unit-aware hypo/hyper deterministic classifier.** New numeric classifier in the safety layer (**not** regex): hypo <70 (soft), <54 or symptomatic (hard); implausible/wrong-unit → `needs_review`, not acted on. Added **below** the F4 crisis branch, importing the exported `safety-gate.ts` action constants. **Blocked on `task_e569880c` merge + green ordering test + those constants being exported.**
- [ ] **P1-3 — Full diabetes loop.** Glucose + Food Lens flags + dose events + activity → one daily summary with ≥1 plain-language correlation (Sonnet). **Fixed, clinician-authored hypoglycemia safety card, never model-generated.**
- [ ] **P1-4 — Hypertension titration prompt.** Ship **only after** F5's regulatory determination (FR-15) + a clinician goal/protocol-authoring surface exist; protocol-bounded, human-approval-gated.
- [ ] **P1-5 — Live data swaps.** Licensed live cost source; maintained versioned interaction/Beers dataset (F10 sign-off). BLE BP cuff + glucometer via F7; begin FHIR summary export.

### Milestone P2 (summary)
- [ ] **P2-1 — COPD/asthma zoned loop.** Extend `Condition` with `"copd"` per F6 checklist (union + `isCarePlan` guard + `selectLens` + real lens + fixtures); green/yellow/red zones; red-zone hard-escalate. Now add `symptomCheckIns`/`rescueUseEvents` to `AppState`.
- [ ] **P2-2 — HIPAA backend (F1) + clinician surface (F8).** Disposition capture/write-back; cohort metrics; EHR/FHIR round-trip.

---

## 5. Data Model & Storage Changes

**New types (`src/domain/types.ts`):**
- `SourceCitation = { name: string; version: string; effectiveDate: string; source: string; url?: string }` (net-new; nothing named `SourceCitation` exists in `src/` today).
- `DeprescribeCandidate = { id; patientId; kind: "interaction"|"beers"|"no_longer_indicated"; medicationIds: string[]; question: string; evidence: EvidenceStatus; citation: SourceCitation }` (evidence defaults `needs_review`; include `patientId` so `hasValidRelationships` can reject cross-patient).
- `CostAlternative = { name: string; estimatedCashPrice: number; sameClass: boolean }`.
- `CostFlag = { id; patientId; medicationId: string; estimatedCashPrice: number; alternatives: CostAlternative[]; estimateLabel: string; citation: SourceCitation }`.
- **P1 types (defined P0 for stability, arrays added P1):** `GlucoseReading = { id; patientId; enteredValue: number; unit: "mg_dl"|"mmol_l"; valueMgDl: number; context: "fasting"|"pre_prandial"|"post_prandial"|"random"; measuredAt: string; note: string }` (store the entered value **and** its unit **and** the canonical mg/dL for auditability — FR-10 unit safety); `ActivityEvent`, `SymptomCheckIn`, `RescueUseEvent`.

**`AppState` additions (P0):** `deprescribeCandidates: DeprescribeCandidate[]`, `costFlags: CostFlag[]`. (`glucoseReadings`/`activityEvents` in P1; symptom/rescue in P2.)

**`AiMode` extension:** add `"teach-back"` (`types.ts:100`) and to `isAiMode` (`storage.ts:188-199`).

**New reducer actions (`store.tsx` `HealthAction` union) — each dispatches `recordAuditEvent()` inline:**
- `{ type: "flagDeprescribeCandidate"; candidate: DeprescribeCandidate }` → audit `"created"`, "Deprescribing question flagged".
- `{ type: "flagCostBarrier"; flag: CostFlag }` → audit `"created"`, "Cost barrier flagged".
- (P1) `logGlucose`, `logActivity`; (P2) `logSymptomCheckIn`, `logRescueUse`.

**Serialization (`storage.ts`) — see §3 [FIX] for the two validation strategies.** Minimum: guards `isDeprescribeCandidate`/`isCostFlag`/`isCostAlternative`/`isSourceCitation`; add both arrays to `isValidCoreAppState`; `undefined→[]` backfill (mirror 484–489); extend `hasValidRelationships` for the new `patientId` fields.

**Fixtures (`fixtures.ts`):** add both arrays to `demoState`/`deletedDemoState`/`brentState`; seed `demoState` with out-of-goal BP history + polypharmacy list.

---

## 6. AI / Model Wiring

**Deterministic in `domain/` (NEVER LLM):** rolling BP average + goal-band comparison; streak/rate; deprescribing interaction/Beers evaluation; cost lookup; (P1) unit-aware hypo/hyper thresholds run before any model call; **all escalation decisions.**

**Haiku (high-volume):** daily plain-language loop-summary rendering, teach-back rephrasings, individual flag explanations, i18n plain-language rendering.

**Sonnet (low-volume, judgment):** deprescribing worklist *framing/narrative* over the deterministically-produced candidate list (the candidates themselves are deterministic — Sonnet only phrases them as plain questions), trend narratives, cost-alternative framing, visit-brief synthesis.

**Realtime voice:** reuse `connectRealtimeSession()`/`reduceRealtimeEvent()` (`src/ai/realtime-session.ts`) for spoken teach-back **P1+ only, and not before the realtime gating from `task_e569880c` lands** (streamed model audio must re-enter the gate).

**Flow through the gate:** every loop/coach response goes through `createSafeAiResponse(request, provider)`. `decideSafety()` runs first; hard-escalate returns without ever calling the provider; soft cases call the provider then attach the banner + care-team actions. The model output is only the plain-language "why," never the escalation decision.

**Offline degradation (FR-14):** with `HEALTH_AI_PROVIDER=mock` (default), the mock returns templated responses for every new mode (add explicit mock branches — the mock does not currently handle `explain/today/ask/trouble/summarize`), and the deterministic layer + seeded tables still fire. Seed → live → "not found" mirrors `food-lookup.ts` for the P1 cost source.

---

## 7. Testing Strategy

**Vitest unit (the safety-critical core):**
- `self-management-loop.test.ts` — interpret/metrics/escalation; **`adherence.test.ts` stays green unchanged** (proves the generalization didn't break the medication instance).
- `hypertension-monitoring.test.ts` — rolling average (SBP+DBP); `<N` → no observation; within goal → no draft; outside goal for N → observation; null goal → standard-education fallback labeled; **never hard-escalate, never a dose imperative.**
- `deprescribing.test.ts` — interaction pair detected; Beers/age-conditioned flag (F2 age present **and** absent → explicit "age unknown" candidate); single-med → none; **assert no imperative verb** (`/\b(stop|reduce|increase|start|change|switch)\b/i`) in any question.
- `cost-transparency.test.ts` — cost-barrier med → flag with estimate label + alternatives; no prescription mutation; draft says "review," not "switch."
- `care-team-message.test.ts` — default `kind:"general"` **byte-identical** to today (do not modify the existing assertion); `deprescribing` iterates full list; `cost`/`bp_trend` target correctly.
- `condition-lens.test.ts` / `food-flags.test.ts` — diabetesLens produces carb/added-sugar/fiber flags; hypertension unchanged.
- `health-brief.test.ts` — three new sections with correct `EvidenceStatus`.
- `storage.test.ts` — new guards accept valid / reject malformed; **migration upgrades a pre-feature state without discarding it**; cross-patient candidate/flag rejected by `hasValidRelationships`.
- `strings.test.ts` — EN/ES parity for all new keys; urgency-string tier not softened in ES.
- `teach-back.test.ts` — restate → confirm/correct decision logic (deterministic).

**Safety-regression tests that MUST stay green (all confirmed to exist; do not weaken):**
- `src/ai/safety-gate.test.ts` — existing hard-escalate ordering. **Add:** dangerous stored reading (182/122) + out-of-goal average → `hard_escalate`, with an explicit assertion that the loop's soft observation cannot demote it (locks the branch order in §1 DoD #3).
- `src/domain/safety.test.ts` + `src/domain/safety-dose-change.test.ts` — the medication-change soft-block still catches "should I stop this?" (reused verbatim for deprescribing, FR-7).
- `src/domain/blood-pressure.test.ts` — `interpretBloodPressure` unchanged.
- **P1 ordering test (with F4):** hypoglycemia numeric threshold sits below the crisis branch and above soft-block; a co-occurring lower-tier signal cannot pre-empt it. Unit-confusion boundaries ("7.0" mmol/L vs "70" mg/dL) resolve correctly or route to `needs_review`.

**Playwright e2e (`npm run test:e2e` = `playwright test`, confirmed):**
- Log a series of out-of-goal BP readings → see the observation + "message my care team" → open the draft (no dose instruction present).
- Open the deprescribing worklist for the polypharmacy fixture → every item shows `needs_review` + the "not exhaustive" disclaimer → draft iterates the whole list.
- Flag a `cost` barrier → see estimate label + alternatives + source/date.
- Export from privacy → new arrays present in the JSON; delete → cleared.

---

## 8. Rollout, Flags & Verification

**No flag framework exists** — env toggles only (`HEALTH_AI_PROVIDER`, `HEALTH_AI_API_KEY`, `HEALTH_AI_REALTIME_MODEL`, `USDA_FDC_API_KEY`).

**P0 demo/verify on the local prototype:**
1. `HEALTH_AI_PROVIDER=mock` (default) — everything runs offline; deterministic layer + seeded tables + templated coach.
2. `npm run dev`, load the seeded `demoState` (out-of-goal BP history + polypharmacy list).
3. Verify all four surfaces render + draft (BP loop observation, deprescribing worklist, cost flag, teach-back); verify a 182/122 reading hard-escalates first.
4. `npm run check` green.
5. Optional live coach: `HEALTH_AI_PROVIDER=openai` + key — Haiku/Sonnet wiring; deterministic decisions unchanged.

**Hard stops before ANY real-PHI / patient use:**
- **F5 legal/clinical copy review** cleared on the deprescribing + cost framing and the seeded ruleset provenance (FR-15). The seeded ruleset must not reach patients unreviewed.
- **F10 licensing** for the interaction/Beers dataset + cost source before the P1 live swap.
- **F4 (`task_e569880c`) merged with green ordering test + exported action constants** before the P1 hypo/hyper slice or any voice teach-back.
- **F1 backend + BAA** before any multi-user, clinician-shared, or cohort-metric use.
- Readability testing + clinical review of EN/ES teach-back copy + the fixed emergency cards (FR-9) — not asserted by prompt.

**On-device P0 leading indicators:** loop check-in completion rate (**baseline: measure the current adherence-logging rate first — do not assume 0**), home-BP readings/week, teach-back confirmation rate, time-from-cost-barrier-to-draft, deprescribing-worklists-generated. Lagging clinical outcomes are **not measurable until F1 + F8 + consent + a study design** — label aspirational.

---

## 9. Risks, Open Questions & Decisions Needed

**Decisions requiring a human (clinical / regulatory / product):**
- **FDA SaMD/CDS line (gating, F5).** Titration is out of P0 because a protocol-driven titration prompt likely fails the Cures §520(o) "independent review" prong. **Decision before P1:** formal regulatory read classifying titration and confirming monitoring/deprescribing/cost stay non-device-CDS.
- **Deprescribing liability & ruleset provenance.** Even as questions, an interaction/Beers flag creates duty-to-act exposure. **Decision before patient exposure:** legal + clinical sign-off on framing + a *named owner + update cadence* for the ruleset. A home-grown table is a liability; likely needs a licensed dataset (F10).
- **Cost-data source & accuracy.** A wrong estimate that drives a decision is a real risk. **Decision for P1:** which licensed, dated source (GoodRx-style terms) + prominence of the "estimate only" treatment.
- **Glucose unit safety (P1).** mg/dL vs mmol/L confusion can invert a hypo/hyper decision. **Decision:** forced-unit entry UX + unit-aware thresholds tested at boundaries before the diabetes loop ships (FR-10).
- **Clinician-authored goals/protocols dependency.** The monitoring goal band + any future titration/COPD zones need clinician config. **Open:** who authors, and how light the authoring UX — unscoped for anything past P0 monitoring.
- **Reimbursement model.** Patient-entered-only P0 data may not qualify for device-based RPM; RTM/CCM may fit better. Affects whether F7 device provenance is needed sooner.

**Technical unknowns / decisions:**
- **`summarizeBpTrend` vs the new engine (recommend: leave it untouched).** It is systolic-only + split-half + `MIN_TREND_READINGS=5`; add the rolling-window math alongside to protect its tests rather than refactoring it into the engine.
- **Storage validation strategy for the new arrays (§3 [FIX]).** Strict-core-validated (whole-state-discard on malformed) vs sanitized-loose (drop bad entries). Recommend strict for the small internal `deprescribeCandidates`/`costFlags`; sanitized for the larger P1 patient-entered glucose/activity streams. Pick per-array before P0-3.
- **`teach-back` `AiMode` entry.** Must trigger only inside an explicit confirm-understanding flow — never from `inferAiMode` free-text heuristics (which today only route `explain → why/visit/ask/trouble`).
- **F9 multi-catalog timing.** If it hasn't landed by P0-18, interim-extend `foodLensStrings` and flag for migration.

---

## 10. Effort & Sequencing Estimate

| Milestone | Size | Notes |
|---|---|---|
| **P0-A** Engine + types + storage + fixtures | **M** | Generalization is real abstraction; the storage-validation choice (§3 [FIX]) is the fiddly part, not a one-liner. |
| **P0-B** Hypertension monitoring loop | **S–M** | New rolling-window math + one UI surface; the safety regression + branch-order assertion is the careful part. |
| **P0-C** Deprescribing worklist v1 | **M** | Engine is small; seeded ruleset + provenance + `buildCareTeamMessage` rewrite carry the weight. Content/legal is the long pole, not code. |
| **P0-D** Cost transparency v1 | **S** | Seeded table + flag + draft; reuses the parameterized message. |
| **P0-E** diabetesLens + teach-back + brief + i18n | **M** | Lens fill is small; teach-back is new interaction logic + a mock branch; brief/i18n/export are mechanical but broad. |
| **P1** Full diabetes loop + hypo/hyper thresholds + titration + live swaps | **L** | Blocked on F4 merge (+ exported constants), F5 read, F7 devices, F10 licensing. |
| **P2** COPD loop + backend + clinician surface | **XL** | Blocked on F1/F8; new condition + zone authoring + write-back. |

**Suggested P0 build order:** P0-A → P0-B → P0-C → P0-D → P0-E → P0-20. A→B first proves the engine on the safest loop; C/D proceed in parallel once the parameterized `buildCareTeamMessage` (P0-10) lands; E's i18n/brief/export gather last because they touch everything. **Start the F5 copy-review and F10 licensing conversations on day one** — they gate patient exposure and are the true long lead, not the engine code.
