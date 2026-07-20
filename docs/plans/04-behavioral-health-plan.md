# Implementation Plan — Integrated Behavioral Health & Crisis Escalation

> **Lifecycle: Rescoped (2026-07-20). Not an active sprint.** [Sprint 08](08-rhtp-integration.md) delivered crisis routing and the minimal PHQ-9 path. [Sprint 12](12-screening-hub.md) owns questionnaire generalization, including GAD-2/GAD-7 delivery. Longitudinal behavioral escalation, behavioral-care messaging, and review surfaces require a later clinically owned workflow plan; do not resume the unchecked umbrella below.

**Spec:** `docs/specs/04-behavioral-health.md`
**Foundations:** `docs/plans/00-foundations.md` (row "04 Behavioral Health / Crisis")

> **Staff-engineer review note.** This plan was hardened against the *live* source, not just the brief. Four defects in the prior draft were corrected: (1) the crisis **Playwright e2e was falsely claimed to run in `npm run check`** — it does not (`check` = lint + Vitest + build; Playwright is the separate `test:e2e` script), so every merge-blocking crisis guarantee is expressed as a **Vitest** test; (2) the plan over-anchored on `safety-gate.ts:48` as a *stable* line for the crisis branch, but F4 (`task_e569880c`) **has not merged** — there is no `crisis_escalate`/`988`/crisis token in `src/` today (verified by grep), so line 48 is cited only as "the current stored-reading block the crisis branch must precede," and is rebound after F4 merges; (3) the prior draft ignored `MAX_TODAY_TASKS = 3` in `buildTodayTasks` — a behavioral task added at priority 1 could **evict a real BP-safety task** from the sliced Today feed, so a ranking-invariant guard + regression test is now a P0 requirement (mirroring spec 01's FR-5 invariant); (4) plumbing the item-9 signal into `decideSafety()` is **this feature's owned work**, not something F4 provides, so it is now an explicit task rather than "bind to as-built."

## Foundations dependencies

| F-item | Blocking? | Feature-specific delta (do not restate the F-item) |
|---|---|---|
| **F4 — Crisis pathway (`task_e569880c`)** | **BLOCKING for the entire P0 crisis backbone** | Crisis routing *is* this feature. F4 owns `crisis_escalate` (first branch of `decideSafety()`), a `CRISIS_ACTIONS` constant, the crisis action string(s), and a `classifyCrisis()` free-text net. **This plan CONSUMES that shape — it never rebuilds it.** Verified: **no `988`/`crisis`/`suicid`/`self-harm`/`call_988` token exists in `src/` yet**, and `AiMessageAction` is still `"call_clinic" \| "draft_message"` (`types.ts:102`), `CARE_TEAM_ACTIONS` is still `["call_clinic","draft_message"]` (`safety-gate.ts:7`). So F4 is genuinely in-flight. This feature ADDS only: the PHQ-9 item-9 *structured* signal into the gate (the primary net), a below-crisis behavioral `soft_escalate` branch, and behavioral crisis copy. Nothing in the P0 crisis milestone starts until `task_e569880c` merges with its ordering test green. |
| **F9 — i18n EN/ES parity gate** | **BLOCKING** | Every patient-facing string (check-in copy, crisis labels, banners, consent) must be EN/ES-complete. Verified: `src/i18n/strings.ts` is Food-Lens-only (`FoodLensStringKey`) and the parity test (`strings.test.ts:20–26`) loops only `foodLensStrings`. F9 generalizes the catalog + parity loop; this plan registers a `behavioralStrings` catalog through it. **Crisis/urgency tier must not soften in translation.** |
| **F5 — Regulatory posture + provenance** | **BLOCKING (legal hold on real-patient exposure, not on build/test)** | The not-responding/deterioration `soft_escalate` rules sit on the FDA non-device-CDS line. F5's counsel read gates *shipping those rules to real patients*, not building/testing them on the localStorage prototype. Deterministic scoring and crisis routing are safety infrastructure, not clinical recommendation, and are not gated on F5. |
| **F3 — Audit actor + action union** | **HELPFUL at P0; BLOCKING for the P1 review queue** | P0 uses the **current** 3-arg `recordAuditEvent(patientId, action, label)` (verified: `audit.ts` has no `actor` param) and adds three action strings to the closed union. F3 extends that union centrally and adds `actor`; align P0's new strings with F3's as-built union at merge. P0 crisis audits are necessarily **anonymous/system** until F3 lands — acceptable for a single-user prototype, called out as a limitation. |
| **F1 — HIPAA backend** | **BLOCKING for P1+ only** | P0 is localStorage-only by design (spec Non-Goals). Any review queue, outreach, or off-device persistence of behavioral-health / 42 CFR Part 2 data is hard-gated on F1. Not needed for P0. |
| **F2 — Demographics** | **HELPFUL, not needed for P0** | P0 needs only the existing `PatientProfile` (esp. `primaryClinicPhone`, `language`). Age-keyed screening cadence is a later concern. |
| **F8 — Return channel** | **HELPFUL / deferred** | The behavioral care-team message is a one-way *draft* (reuses `buildCareTeamMessage` pattern). A clinician→patient return signal is a P1 measurement enabler, not a P0 blocker. |

---

## 1. Objective & P0 Definition of Done

**Objective.** Ship a between-visits behavioral-health **measurement + crisis backbone** as an *extension* of the shipped coach / safety-gate / adherence primitives, runnable entirely on the current localStorage prototype, with a deterministic, provider-independent suicidality guardrail that outranks every other safety branch.

**The thin P0 slice (matches spec Phasing → P0):**

1. **PHQ-9 and GAD-7 check-ins** as `AssessmentEvent` records, **deterministic** scoring + severity bands (no model).
2. **`computeTrend()`** (deterministic) + the **"not responding" / "deterioration"** `soft_escalate` rules — surface-and-route only, trend data only, never a treatment recommendation.
3. **Full crisis path (consuming F4):** the item-9 structured trigger + F4's free-text net → `crisis_escalate` as the first branch of `decideSafety()`, provider bypass, fixed 988 / emergency / clinic surface, no-burial guarantee.
4. **Behavioral section in the Health Brief**; **behavioral variant of `buildCareTeamMessage()`**; **check-ins in the Today feed with a ranking guard**; **consent/disclaimer gate**; **audit + `/privacy` export/delete** coverage.

**Explicitly NOT in P0** (spec): AUDIT-C / alcohol module, loneliness measure / `isolationLens`, guided CBT coaching modules (Sonnet), engagement-barrier module loop, push notifications, care-team review queue, any backend, any EHR write-back.

**P0 Definition of Done (acceptance):**

1. A patient opens a PHQ-9 or GAD-7 check-in from the Today feed, answers all items, and sees a stored, dated `AssessmentEvent` (`status: "patient_reported"`) with `totalScore` + `severityBand` **validated against the published scoring tables** in Vitest unit tests. (FR-1)
2. A second completion of the same instrument produces a `computeTrend()` result (baseline, current, change-from-baseline, direction) in **pure domain code with zero model calls**. (FR-2)
3. **PHQ-9 item-9 > 0 always yields `crisis_escalate`, independent of total score** — Vitest unit test. (FR-4, FR-5)
4. **`crisis_escalate` is returned even when a dangerous-vitals stored reading co-occurs** — Vitest ordering test proving crisis precedes the stored-reading (`recentClinicalReading`) block. Provider not called. (FR-5)
5. On a crisis turn **the provider is never called** and `content` equals the fixed human-authored constant — Vitest provider-bypass test using a `vi.fn()` provider. (FR-6)
6. A crisis turn **never returns a normal answer** even when the input also contains an unrelated question — Vitest no-burial test. (FR-8)
7. The **not-responding / deterioration `soft_escalate`** attaches a banner + a `draft_message` prefilled with **trend data only** (no medication/treatment recommendation) — Vitest assertion on the draft string. (FR-3)
8. **A behavioral Today task can NEVER evict a priority-1 safety/reading task** from the `MAX_TODAY_TASKS = 3` slice — Vitest ranking-invariant regression test (behavioral routine tasks are priority ≥ 2). (FR-14)
9. Behavioral events appear in the Health Brief behavioral section (each with an `EvidenceStatus`, always `patient_reported`, never a diagnosis) and in the audit trail (`assessment_recorded`, `escalation_raised`, `crisis_escalated`); all are exportable/deletable via `/privacy`. (FR-13, FR-15)
10. All new EN strings have ES counterparts; the generalized parity test (F9) is green.
11. **`npm run check` (lint + Vitest + build) is green, including every safety-regression test** (`safety-gate.test.ts`, `safety.test.ts`, `safety-dose-change.test.ts` unchanged in outcome).
12. **Playwright e2e (`npm run test:e2e`, separate from `check`)** asserts the crisis surface renders 988 (call + text), emergency, and the clinic number, localized, and cannot be dismissed into a normal answer. (This is a **release gate**, run in CI as its own step — it does NOT block `npm run check`; the merge-blocking crisis guarantees are the Vitest tests in items 3–6.)

**P0 value proposition:** a family doctor gets real measurement-based-care tracking (PHQ-9/GAD-7 trajectories) and a tested, provider-independent crisis path with **zero** new infrastructure.

---

## 2. Prerequisites & Dependencies

**Hard gates (must clear before the relevant P0 work starts):**

- **`task_e569880c` (F4) MUST be merged first**, ordering test green, before any code in Milestone **P0-CRISIS**. Verified current state: the crisis primitives do not exist yet. This plan assumes F4's *as-built* shape:
  - a `CRISIS_ACTIONS` constant exported from `src/ai/safety-gate.ts` (analogous to `CARE_TEAM_ACTIONS` at `safety-gate.ts:7`);
  - a `crisis_escalate` decision `kind` that is the **first** conditional in `decideSafety()` — ahead of the `recentClinicalReading` block (currently `safety-gate.ts:48`, which F4 will have rewritten);
  - a crisis action string on `AiMessageAction` (F4 expects `"call_988"`, possibly `"call_911"`);
  - a `classifyCrisis()` (or extended `classifySafety()`) self-harm/suicidality net.
  - **Binding step (P0-CRISIS0):** before writing crisis code, read the *merged* `safety-gate.ts`/`safety.ts` and record the exact exported names. This plan uses `CRISIS_ACTIONS`, `crisis_escalate`, `classifyCrisis` as placeholders; **bind to the as-built symbols — never re-introduce parallels.**
- **F9 parity-test generalization** should land first (it is cheap) so `behavioralStrings` is gated from its first commit. Fallback if F9 slips: add `behavioralStrings` to `strings.ts` and extend `strings.test.ts` to loop both catalogs locally, coordinating to avoid a fork.

**Deferrable / not blocking the P0 build (gate patient exposure, not dev):**

- **F5 legal read** blocks *shipping the `soft_escalate` trend rules to real patients*, not building/testing on the prototype.
- **F1 backend, F3 actor field, F8 return channel** are P1 concerns (review queue, clinician acknowledgment, bidirectional messaging).

**External dependencies:**

- **988 Suicide & Crisis Lifeline** — `tel:988` and SMS-to-988 deep links. **No API.** Must function offline-to-dialer (FR-7). P0.
- **No devices, no EHR, no push** in P0 (all self-report; Today-feed surfacing only).

**Instrument licensing (FR-18) — a content prerequisite, not a code one:** PHQ-9 and GAD-7 are freely usable with standard wording; ship the **unmodified** item text and record the confirmation in the instrument catalog's `source`/`version` tag (F10 posture). The loneliness measure is **out of P0** precisely to defer its licensing question.

---

## 3. Architecture & Approach

The feature is a set of new **deterministic domain modules** + **type extensions** + **one new patient surface** + **one consumed safety-gate branch** + **one item-9 plumbing task**. Nothing about crisis detection or scoring touches an LLM.

### New modules (create)

- **`src/domain/assessment-instruments.ts`** — static instrument catalog: item wording, response options (0–3), scoring, severity thresholds, the **PHQ-9 item-9 index as a named constant**. Kept separate from logic so licensing/wording review has one target. Each instrument carries `version` + `source` (F10 dataset-registry posture).
- **`src/domain/assessment.ts`** — the deterministic core: `scoreAssessment()`, `severityBand()`, `computeTrend()`. **Structurally the analog of `src/domain/adherence.ts`** (`getAdherenceRate()` / `summarizeBpTrend()` are the templates — pure functions over dated patient-reported records).
- **`src/domain/behavioral-escalation.ts`** — pure evaluators mapping scored assessment + trend to a tier (`none | soft_escalate`) and the **item-9 crisis signal** (`hasActiveItem9Signal(state)`). This module produces the *structured signal* the gate reads; **the crisis decision itself lives in the gate (F4).** Thresholds are module-level constants (clinician-tunable later).
- **`src/domain/behavioral-care-team-message.ts`** — `buildBehavioralCareTeamMessage(state)`, a variant of `buildCareTeamMessage()` (`care-team-message.ts`): recent scores, trend direction, item-9 status. **Sends nothing.** The `soft_escalate` draft uses **trend data only**.
- **`src/components/behavioral/crisis-resource-card.tsx`** — renders 988 call/text, emergency `tel:`, and `primaryClinicPhone`, localized; **988 + emergency render even if `primaryClinicPhone` is empty** (the clinic action degrades, the lifeline never does).
- **`src/app/behavioral/page.tsx`** (+ small components under `src/components/behavioral/`) — check-in surface: instrument runner, result view, consent gate.
- **`src/i18n/behavioral-strings.ts`** (or a `behavioralStrings` catalog registered in `strings.ts` per F9) — all EN/ES copy including the fixed crisis constant.

### Existing modules (extend)

- **`src/ai/types.ts` (`HealthAiRequest`)** — this feature's **owned plumbing**: confirm the request carries `state: AppState` (verified it does, `ai/types.ts:3` per foundations) so the latest `AssessmentEvent` is reachable from the gate. No new request field needed if `state.assessmentEvents` is populated; if F4 introduced a dedicated `request.assessment` field, bind to it instead. **This wiring is a named task (P0-CRISIS1), not something F4 delivers.**
- **`src/ai/safety-gate.ts`** — **consume** F4's crisis branch and extend its condition to also fire on `hasActiveItem9Signal(request.state)`. Add a `soft_escalate`-tier behavioral branch strictly **below crisis and below the existing hard-escalate vitals/symptom branches** (respect F4's tier order: crisis → hard-escalate vitals/symptoms → soft-escalate threshold → soft-block med-change). Every new branch gets an ordering test.
- **`src/domain/safety.ts`** — the free-text crisis net lands in F4's `classifyCrisis()`. Only if F4 did not add a dedicated function, add the crisis pattern group here alongside `urgentSymptomPatterns` / `medicationChangePatterns` — but prefer F4's function.
- **`src/domain/tasks.ts` (`buildTodayTasks`)** — add behavioral check-in tasks **at priority ≥ 2**, appended before the existing `.sort((a,b)=>a.priority-b.priority).slice(0, MAX_TODAY_TASKS)` (`tasks.ts:102`, `MAX_TODAY_TASKS = 3` at `tasks.ts:4`). Because behavioral tasks are priority ≥ 2 and the sort is priority-stable, the slice can only ever drop a behavioral task, never a priority-1 safety/reading task. Extend `TaskItem["kind"]` with `"behavioral"`.
- **`src/domain/health-brief.ts` (`buildHealthBrief`)** — add a behavioral section following the existing per-section `{ title, items, status }` shape (verified `health-brief.ts` builds `sections` this way), each item carrying an `EvidenceStatus`.
- **`src/state/store.tsx`** — new reducer actions (`recordAssessment`, `acknowledgeBehavioralConsent`, and the crisis-audit path). Auto-audit via the existing 3-arg `recordAuditEvent()` exactly as `addReading` (`store.tsx:46`) and the dose actions (`store.tsx:118`) do today.
- **`src/state/storage.ts`** — add `isAssessmentEvent()` guard; include `assessmentEvents` in `isValidCoreAppState`/`isValidAppState` (429–470) and a `sanitizeAssessmentEvents()` filter mirroring `sanitizeDoseEvents` (418–427). Extend `isAuditEvent()` (346–360) for the three new action strings and `isTask()` (295–306) for `"behavioral"`. Add a migration shim in `loadStoredState()` mirroring the `mealLog`/`doseEvents === undefined` back-fill (**verified at `storage.ts:484–489`**).

### Data flow

**Check-in path (deterministic, no model):**
```
Today feed (buildTodayTasks, priority ≥2) → /behavioral instrument runner
  → answers → scoreAssessment() + severityBand()          [assessment.ts, pure]
  → dispatch recordAssessment → store.tsx reducer → AssessmentEvent persisted + audit "assessment_recorded"
  → computeTrend() over prior events                       [assessment.ts, pure]
  → evaluateBehavioralEscalation()                          [behavioral-escalation.ts, pure]
       ├─ item-9 > 0 → hasActiveItem9Signal() true → crisis surface via decideSafety() first branch (F4)
       ├─ not-responding / deterioration → soft_escalate → banner + trend-only draft
       └─ else → encouraging copy, next check-in
```

**Coach turn path (unchanged spine):** every coach message flows through `createSafeAiResponse()` (`safety-gate.ts:107`). A crisis disclosure typed mid-conversation is caught by F4's crisis branch (free-text net) exactly as hard-escalates are today — provider never called (`safety-gate.ts:115`), fixed constant returned. This feature's *only* additions to that path are (a) the item-9 structured signal feeding the crisis branch and (b) the below-crisis behavioral `soft_escalate` branch.

**Crisis-audit guarantee (design decision):** the `crisis_escalated` audit event is written **at the escalation decision seam**, not left to an individual UI call site, so a UI that forgets to dispatch cannot silently drop a legally-defensible crisis record. See P0-CRISIS7 and Open Questions.

---

## 4. Work Breakdown (sequenced)

Milestones map to spec P0/P1/P2. **P0-CRISIS is gated on `task_e569880c` merge.** Do **P0-A** (deterministic core, no gate dependency) in parallel with the F4 merge wait; then **P0-CRISIS**; then the surfaces (**P0-B**).

### Milestone P0-A — Deterministic assessment core (no F4 dependency; start immediately)

- [ ] **P0-A1 — Instrument catalog.** Author PHQ-9 (9 items) + GAD-7 (7 items) with **standard, unmodified** wording, 0–3 response scales, scoring, severity thresholds; export PHQ-9's item-9 index as a named constant; add `version` + `source` tags.
  *Files:* create `src/domain/assessment-instruments.ts`.
  *Accept:* PHQ-9 bands (0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 mod-severe, 20–27 severe); GAD-7 bands (0–4, 5–9, 10–14, 15–21); item-9 index is a named constant; wording reviewed against published instruments before merge.
- [ ] **P0-A2 — Types.** Add `AssessmentEvent`, `BehavioralInstrumentId`, `SeverityBand`, `AssessmentTrend`; extend `AppState` with `assessmentEvents`.
  *Files:* modify `src/domain/types.ts`.
  *Accept:* compiles; `AssessmentEvent` = `{ id, patientId, instrumentId, itemResponses, totalScore, severityBand, status: "patient_reported", recordedAt }`. (See §5.)
- [ ] **P0-A3 — Scoring.** `scoreAssessment(instrumentId, itemResponses)` → `{ totalScore, severityBand }`, pure.
  *Files:* create `src/domain/assessment.ts`.
  *Accept:* Vitest over known vectors (all-zero, all-max, **every band-edge boundary**) matches the published tables exactly; invalid response length → typed error, never a fabricated score.
- [ ] **P0-A4 — Trend.** `computeTrend(events, instrumentId)` → `{ baseline, current, changeFromBaseline, direction }` (baseline = first score per instrument), analog to `getAdherenceRate()`.
  *Files:* `src/domain/assessment.ts`.
  *Accept:* Vitest for single-event (no trend), improving, worsening, stable; no model invoked.
- [ ] **P0-A5 — Escalation rule evaluators (surface, don't prescribe).** `evaluateBehavioralEscalation(events, instrumentId)` → `{ tier: "none" | "soft_escalate"; reason: "not_responding" | "deterioration" | null }`; **configurable** module-constant thresholds (e.g. not-responding = <50% reduction from baseline after N weeks; deterioration = band worsening or entry into mod-severe/severe). Also `hasActiveItem9Signal(state)` reading the most-recent PHQ-9's item-9.
  *Files:* create `src/domain/behavioral-escalation.ts`.
  *Accept:* Vitest asserts tier for boundary cases; **no output string names a medication or treatment action** (asserted); `hasActiveItem9Signal` returns true iff the latest PHQ-9 item-9 > 0.
- [ ] **P0-A6 — Reducer + persistence for assessments.** Add `recordAssessment` action; auto-audit `"assessment_recorded"` via the existing 3-arg `recordAuditEvent`. Add `isAssessmentEvent` guard + `sanitizeAssessmentEvents` + the migration shim.
  *Files:* modify `src/state/store.tsx`, `src/state/storage.ts`.
  *Accept:* `dispatch({ type: "recordAssessment", event })` persists + appends one audit event; `loadStoredState()` tolerates pre-feature state (shim defaults `assessmentEvents` to `[]`, mirroring `storage.ts:484–489`) with **no data loss**; a foreign/malformed `AssessmentEvent` is sanitized out on load. Tests in the style of `src/state/dose-reducer.test.ts` / `dose-storage.test.ts`.

### Milestone P0-CRISIS — Crisis backbone (GATED on `task_e569880c` merge)

> **P0-CRISIS0…7 SATISFIED — 2026-07-06, sprint [08 (rhtp integration)](08-rhtp-integration.md).** F4 landed and this sprint built the crisis backbone directly. As-built: `classifyCrisis()` (`src/domain/safety.ts`), `crisis_escalate` as the first branch of `decideSafety()`, provider bypass returning the fixed `tSafety(language,"crisisResponse")` constant (en/es), no-burial ordering test (crisis wins over a co-occurring dangerous stored reading), free-text net with strip-then-rescan negation traps, `crisis_escalated` audit written at the store seam, and the FR-14 `MAX_TODAY_TASKS` ranking guard. The PHQ-9 item-9 structured signal (`phq9Item9IsPositive`, `src/domain/assessment.ts`) routes through the same crisis surface from `/checkin`, independent of total score. **Remainder still open:** P0-A trends/GAD-7/behavioral-lens depth and the P0-B non-crisis behavioral surfaces (`soft_escalate` behavioral tier, review queue) — this sprint shipped the minimal PHQ-9 subset only.

- [ ] **P0-CRISIS0 — Bind to as-built F4 shape.** Read merged `safety-gate.ts`/`safety.ts`; record the real names of the crisis-actions constant, crisis action string(s), crisis decision `kind`, and the crisis classifier. Rebind every placeholder below.
  *Accept:* no unbound `CRISIS_ACTIONS`/`classifyCrisis`/`crisis_escalate` placeholders remain; the current line-48 anchor is re-verified against the merged file (F4 will have moved it).
- [ ] **P0-CRISIS1 — Item-9 structured signal into the gate (THIS feature owns the plumbing).** Extend F4's crisis branch condition in `decideSafety()` so it also fires when `hasActiveItem9Signal(request.state)` is true, **independent of total score and independent of any free-text**. Confirm `HealthAiRequest` carries `state.assessmentEvents` (bind to F4's `request.assessment` field instead if it added one).
  *Files:* modify `src/ai/safety-gate.ts`; use `hasActiveItem9Signal` from `behavioral-escalation.ts`.
  *Accept:* **Vitest: item-9 > 0 → `crisis_escalate` even with total score 0 and no free-text crisis language.**
- [ ] **P0-CRISIS2 — Ordering guarantee (load-bearing).** Crisis must win over a co-occurring dangerous stored reading.
  *Files:* extend `src/ai/safety-gate.test.ts` (do not fork — the suite already exercises dangerous-reading ordering).
  *Accept:* **Vitest ordering test:** state has a 170/104 stored reading (today) AND a PHQ-9 with item-9 > 0 → response is the **crisis** surface, not the vitals escalate; provider not called. Proves crisis precedes the `recentClinicalReading` block.
- [ ] **P0-CRISIS3 — Provider bypass + fixed constant.** On crisis, the provider is never called and `content` equals the fixed human-authored constant (localized), mirroring the `hard_escalate` short-circuit (`safety-gate.ts:115`).
  *Files:* `src/ai/safety-gate.ts` (consume F4), `src/i18n/behavioral-strings.ts`.
  *Accept:* **Vitest provider-bypass test** with a `vi.fn()` provider: `provider.respond` NOT called; `content` is the constant.
- [ ] **P0-CRISIS4 — No burial.** A crisis turn never returns a normal answer even when the input contains an unrelated question.
  *Files:* `src/ai/safety-gate.test.ts`.
  *Accept:* **Vitest no-burial test:** `"I don't want to be here anymore, also what is my BP target?"` → crisis surface only; no BP-target content in `content`.
- [ ] **P0-CRISIS5 — Free-text crisis net (supplementary) + negation traps.** Ensure F4's `classifyCrisis()` covers ideation/intent/plan/self-harm; add **negation-trap** cases so `"I would never hurt myself"` does NOT misfire while `"I don't want to be here anymore"` does.
  *Files:* add cases to F4's classifier test (or `src/domain/safety.test.ts` if the net lives there).
  *Accept:* curated true-positive corpus → escalate; negation traps → do not misfire. Residual false-negative risk is documented, not "solved" — no completeness claim in copy.
- [ ] **P0-CRISIS6 — Crisis resource surface (988 never depends on clinic phone).** Component renders 988 call (`tel:988`), text (SMS to 988), emergency `tel:` dialer, and `primaryClinicPhone`, localized to `PatientProfile.language`; deep links work offline-to-dialer.
  *Files:* create `src/components/behavioral/crisis-resource-card.tsx`; wire into `/behavioral` and the coach response renderer where the crisis action(s) appear.
  *Accept:* **Playwright e2e** (`e2e/behavioral.spec.ts` or extend `e2e/home-health.spec.ts`, run via `npm run test:e2e`): a crisis input renders 988 call + text and the turn cannot be dismissed into a normal answer; **with `primaryClinicPhone` empty, 988 + emergency still render** (the clinic action is the only thing that degrades). Plus a Vitest render/unit test of the same degradation so the guarantee is in the merge-blocking suite too.
- [ ] **P0-CRISIS7 — Crisis audit at the decision seam.** A crisis escalation writes a distinct `"crisis_escalated"` audit event, tied to the escalation decision (not an optional UI dispatch); exportable/deletable via `/privacy`.
  *Files:* `src/state/store.tsx`, `src/domain/types.ts` (`AuditEvent["action"]`), `src/state/storage.ts` (`isAuditEvent` 346–360).
  *Accept:* a crisis turn appends exactly one `"crisis_escalated"` event; it appears in `/privacy` export and is removed by delete; a unit test proves the audit fires whenever the gate returns crisis (not only when the UI happens to call it).

### Milestone P0-B — Patient surface, brief, routing, care-team message

- [ ] **P0-B1 — Consent/disclaimer gate (FR-16).** First entry into `/behavioral` requires acknowledgment (not a crisis service, not therapy, not a substitute for care; discloses the residual false-negative risk); 988 always one tap away thereafter. Records consent as an audit event.
  *Files:* `src/app/behavioral/page.tsx`, `src/i18n/behavioral-strings.ts`, `acknowledgeBehavioralConsent` store action.
  *Accept:* gate blocks the runner until acknowledged; acknowledgment is audited; a 988 affordance is present on every subsequent view.
- [ ] **P0-B2 — Instrument runner UI.** Render PHQ-9/GAD-7 items, collect 0–3 responses, submit → `scoreAssessment` → `recordAssessment` → result view with `computeTrend()` outcome branches (improving/stable, not-responding, deterioration, item-9 crisis).
  *Files:* `src/app/behavioral/page.tsx`, `src/components/behavioral/*`.
  *Accept:* completing a check-in stores the event and shows the correct branch; item-9 > 0 routes to the crisis surface immediately.
- [ ] **P0-B3 — Today feed integration + RANKING GUARD (FR-14).** Behavioral check-ins surface via `buildTodayTasks()` **at priority ≥ 2**; extend `TaskItem["kind"]` with `"behavioral"`. Append before the `.sort().slice(0, MAX_TODAY_TASKS)`.
  *Files:* `src/domain/tasks.ts`, `src/domain/types.ts`, `src/state/storage.ts` (`isTask` 295–306).
  *Accept:* **Vitest ranking-invariant regression test (the heart of FR-14, mirroring spec 01's FR-5):** with a co-occurring priority-1 safety/reading task AND ≥ 2 behavioral tasks, the sliced output still contains the priority-1 safety task and drops only behavioral items. A behavioral task is never priority 1. This test must stay green forever.
- [ ] **P0-B4 — Behavioral care-team message (FR-12).** `buildBehavioralCareTeamMessage(state)` composes recent scores, trend, item-9 status; sends nothing. The `soft_escalate` draft uses **trend data only**.
  *Files:* create `src/domain/behavioral-care-team-message.ts`; test in the style of `src/domain/care-team-message.test.ts`.
  *Accept:* the draft contains scores/trend/item-9 status and **no medication or treatment recommendation** (asserted); nothing is transmitted.
- [ ] **P0-B5 — Behavioral brief section (FR-13).** `buildHealthBrief()` gains a behavioral section: PHQ-9/GAD-7 trajectories, item-9 history, adherence correlation, escalation events — each with an `EvidenceStatus` (scores always `patient_reported`, never `confirmed`, never a diagnosis).
  *Files:* `src/domain/health-brief.ts`; test in `src/domain/health-brief.test.ts`.
  *Accept:* the brief includes the section with correct per-item evidence status; no diagnosis text; absent-data case renders an honest placeholder.
- [ ] **P0-B6 — Behavioral `soft_escalate` banner path.** The not-responding/deterioration tier produces a banner + the existing `CARE_TEAM_ACTIONS` (`draft_message`) with the trend-only draft. This branch is **below crisis and below hard-escalate vitals/symptoms** in `decideSafety()`.
  *Files:* `src/ai/safety-gate.ts` (new below-crisis branch), `src/i18n/behavioral-strings.ts`.
  *Accept:* banner says "your scores haven't improved as much as we'd hope — worth talking with your care team," never "your medication needs changing." **Vitest ordering test:** a co-occurring dangerous vital still hard-escalates over this soft tier. Full `safety-gate.test.ts` re-run green after this edit.
- [ ] **P0-B7 — i18n parity.** All new EN keys have ES; `behavioralStrings` registered through F9's generalized catalog + parity loop.
  *Files:* `src/i18n/behavioral-strings.ts` (or `strings.ts`), `src/i18n/strings.test.ts`.
  *Accept:* parity test green over the behavioral catalog; crisis/urgency copy preserves tier in ES.

### Milestone P1 (out of P0 — sequencing only)
Guided `depressionLens`/`anxietyLens` CBT/behavioral-activation modules (Sonnet, streaming) + engagement-barrier loop; AUDIT-C + alcohol brief intervention; licensed loneliness measure + `isolationLens`; push reminders; **care-manager review queue (needs F1 + F3)**. Note: behavioral lenses need a *new* lens type — they cannot reuse `ConditionLens` (verified: it mandates `nutrientRules`/`medDietRules`, which are food-specific).

### Milestone P2 (out of P0)
FHIR `Observation`/`QuestionnaireResponse` write-back; community-resource referrals; CoCM CPT reporting; response/remission cohort analytics.

---

## 5. Data Model & Storage Changes

**New types (`src/domain/types.ts`):**

```ts
export type BehavioralInstrumentId = "phq9" | "gad7"; // AUDIT-C / loneliness in P1

export type SeverityBand =
  | "minimal" | "mild" | "moderate" | "moderately_severe" | "severe"; // PHQ-9; GAD-7 uses minimal/mild/moderate/severe

export type AssessmentEvent = {
  id: string;
  patientId: string;
  instrumentId: BehavioralInstrumentId;
  itemResponses: number[];          // one 0–3 per item, standard order; PHQ-9 item-9 at the fixed catalog index
  totalScore: number;
  severityBand: SeverityBand;
  status: "patient_reported";       // always patient_reported; never confirmed, never a diagnosis
  recordedAt: string;               // ISO
};

export type AssessmentTrend = {
  instrumentId: BehavioralInstrumentId;
  baseline: number;                 // first score
  current: number;
  changeFromBaseline: number;
  direction: "improving" | "stable" | "worsening";
};
```

**Extended unions (extend, do not replace):**

- `AiMessageAction` (`types.ts:102`) — **F4 adds the crisis action(s)** (`"call_988"`/possibly `"call_911"`). This feature does **not** add its own crisis action; it consumes F4's.
- `AuditEvent["action"]` (`types.ts:130`, verified closed union) — add `"assessment_recorded"`, `"escalation_raised"`, `"crisis_escalated"`. Coordinate with F3 (which also extends this union + adds `actor`); reconcile names at F3 merge. Also extend the `isAuditEvent()` guard (`storage.ts:346–360`).
- `TaskItem["kind"]` (`types.ts:77`) — add `"behavioral"`; extend the `isTask()` guard (`storage.ts:295–306`).
- `AppState` (`types.ts:181`) — add `assessmentEvents: AssessmentEvent[]`. (Engagement-barrier records are **P1**, only when skills modules ship.)

**New reducer actions (`src/state/store.tsx` `HealthAction` at `store.tsx:27`):**

- `{ type: "recordAssessment"; event: AssessmentEvent }` — appends to `assessmentEvents`, auto-audits `"assessment_recorded"` (mirror `addReading` at `store.tsx:46`).
- `{ type: "acknowledgeBehavioralConsent" }` — records the consent gate (audit).
- The **`"crisis_escalated"` audit** is written at the escalation seam (P0-CRISIS7), not left to an optional UI dispatch.

**Serialization / storage (`src/state/storage.ts`) — verified facts:**

- **No `src/domain/serialization` module exists.** State persists via plain `JSON.stringify(state)` in `saveStoredState()` (`storage.ts:531`) and is validated on load in `loadStoredState()`. All changes are **guards + a migration shim**, not a serializer.
- Add `isAssessmentEvent()`; include `assessmentEvents` in `isValidCoreAppState`/`isValidAppState` (429–470); add `sanitizeAssessmentEvents(events, patientId)` mirroring `sanitizeDoseEvents` (418–427).
- **Migration shim (REQUIRED, not optional):** in `loadStoredState()`, default `parsed.assessmentEvents ??= []` before validation, exactly like the `mealLog`/`doseEvents === undefined` shim at **`storage.ts:484–489`**. Without it, `isValidCoreAppState` rejects pre-feature state and resets to `demoState`, silently discarding a real user's data.

**Fixtures:** the three exported fixtures are `demoState`, `deletedDemoState`, `brentState` (`src/domain/fixtures.ts`). Each must gain `assessmentEvents: []` (or seeded events for demo) so the app + tests compile.

---

## 6. AI / Model Wiring

**Deterministic (domain/, never LLM) — the safety-critical core:** instrument scoring, severity bands, `computeTrend()`, the not-responding/deterioration evaluators, PHQ-9 item-9 detection, and free-text crisis matching are **plain code** in `src/domain/`. Crisis routing never depends on an LLM (FR-17); a provider outage cannot disable it because all of this is client-side and provider-independent.

**Haiku (high-volume, low-stakes copy):** check-in nudges, barrier prompts, short encouragement — mostly **P1** (P0 uses static localized strings).

**Sonnet (streaming):** behavioral-activation guidance, CBT reframes, brief narrative — **out of P0** (no guided modules). Every Sonnet turn still passes through `createSafeAiResponse()`.

**Flow through the safety gate:** the coach spine is unchanged — `createSafeAiResponse(request, provider)` (`safety-gate.ts:107`). This feature's only wiring is (a) the item-9 structured signal feeding F4's crisis branch (P0-CRISIS1) and (b) the below-crisis behavioral `soft_escalate` branch (P0-B6). On crisis the provider is bypassed and a **fixed human-authored constant** is returned (never `providerResponse.content`), mirroring `safety-gate.ts:115`.

**Realtime/voice (P1+):** if spoken check-ins later use the WebRTC path (`src/ai/realtime-session.ts`), crisis detection still runs on the transcript client-side, and F4's realtime gating (spec 07 FR-6a) prevents streamed model audio from bypassing the gate. Not in P0.

**Env posture:** no flag framework — only `HEALTH_AI_PROVIDER=mock|openai` (+ `HEALTH_AI_API_KEY`, `HEALTH_AI_REALTIME_MODEL`). P0 runs entirely under `mock` (no key); the deterministic core and crisis path are identical under `mock` and `openai` because they never call the provider.

---

## 7. Testing Strategy

**Merge gate = `npm run check` (lint + Vitest + build).** Playwright (`npm run test:e2e`) is a **separate CI step and release gate**, NOT part of `check` — so every crisis *guarantee* below is a **Vitest** test, and Playwright adds end-to-end confidence on top.

**Vitest — deterministic domain (new):**
- `src/domain/assessment.test.ts` — scoring against published tables (all-zero, all-max, **every band boundary** for PHQ-9 and GAD-7); `computeTrend()` for single/improving/worsening/stable; invalid-length input → error, never a fabricated score.
- `src/domain/behavioral-escalation.test.ts` — not-responding/deterioration tier boundaries; `hasActiveItem9Signal` correctness; **assert no output string names a medication or treatment action.**
- `src/domain/behavioral-care-team-message.test.ts` — draft contains scores/trend/item-9 status; **no treatment recommendation**; nothing transmitted.
- `src/domain/tasks.test.ts` (extend) — **ranking-invariant regression (FR-14):** priority-1 safety task + ≥ 2 behavioral tasks → slice keeps the safety task, drops behavioral. Behavioral is never priority 1. Must stay green.
- `src/domain/health-brief.test.ts` (extend) — behavioral section present with correct per-item `EvidenceStatus`; no diagnosis text.

**Vitest — safety gate (extend `src/ai/safety-gate.test.ts`, the existing suite):**
- **Item-9 test:** item-9 > 0 → `crisis_escalate` independent of total score, no free-text.
- **Ordering test (load-bearing):** dangerous stored reading (170/104 today) + item-9 > 0 → crisis surface, not vitals escalate; provider not called.
- **Provider-bypass test:** crisis turn → `provider.respond` (`vi.fn()`) not called; `content` = the fixed constant.
- **No-burial test:** crisis input + unrelated question → crisis surface only.
- **Below-crisis ordering test:** behavioral `soft_escalate` + dangerous vital → vitals hard-escalate wins.
- **Regression — must stay green:** every existing `safety-gate.test.ts` case (dangerous-reading escalation, med-change block, side-effect escalation, stale-reading window, banner-not-broken-record). The crisis branch may only *add* a strictly-higher-priority branch; it must not change any current outcome. Re-run `safety-gate.test.ts` + `safety.test.ts` + `safety-dose-change.test.ts` after every gate edit (P0-CRISIS1/2/3, P0-B6).

**Vitest — classifier (F4's `classifyCrisis`, extend its test):** curated true-positive ideation/intent/plan/self-harm → escalate; **negation traps** (`"I would never hurt myself"`, `"I'm not going to do anything"`) → do NOT misfire; real ideation still fires.

**Vitest — state (mirror `dose-reducer.test.ts` / `dose-storage.test.ts`):** `recordAssessment` persists + audits; `loadStoredState()` shim tolerates pre-feature state (**no data loss**); foreign/malformed `AssessmentEvent` sanitized out; `"crisis_escalated"`/`"assessment_recorded"`/`"escalation_raised"` accepted by `isAuditEvent`; the crisis-audit-at-seam test (P0-CRISIS7).

**Playwright e2e (`e2e/behavioral.spec.ts` or extend `e2e/home-health.spec.ts`; `npm run test:e2e`):** complete a PHQ-9 → stored + result shown; crisis input → 988 call + text + clinic number render and the turn cannot be dismissed into a normal answer; **`primaryClinicPhone` empty → 988 + emergency still render**; consent gate blocks the runner until acknowledged.

**i18n:** generalized parity test (F9) over `behavioralStrings` — every EN key has ES; crisis/urgency tier preserved.

---

## 8. Rollout, Flags & Verification

**No flag framework** — env toggles only (`HEALTH_AI_PROVIDER=mock|openai`, `HEALTH_AI_API_KEY`, `HEALTH_AI_REALTIME_MODEL`). There is no runtime feature-flag system to hide `/behavioral` behind, so P0 rollout = merging the route; gate real-patient exposure at the deploy/consent level.

**Demo/verify P0 on the localStorage prototype:**
1. `npm run dev` (runs under `mock`, no API key).
2. `/behavioral` → acknowledge consent gate.
3. Complete a PHQ-9 with item-9 = 0 → stored event + trend/encouragement branch.
4. Complete a second PHQ-9 with a lower total → `computeTrend()` "improving".
5. Complete a PHQ-9 with **item-9 = 1** → **immediate crisis surface** (988 call/text, emergency, clinic number); confirm no normal answer and the provider was not called.
6. In `/chat`, type a crisis phrase → same crisis surface; the coach won't answer an appended unrelated question.
7. Add a 170/104 reading in `/numbers`, then trigger item-9 > 0 → crisis still wins.
8. Confirm the Today feed still shows a priority-1 reading task when a behavioral check-in is also due (ranking guard).
9. `/visits` → behavioral brief section. `/privacy` → assessment + crisis audit events present; export includes them; delete removes them.
10. Set `PatientProfile.language = "es"` (fixture) → crisis surface + banners render in Spanish.
11. `npm run check` green; then `npm run test:e2e` green.

**Ship gate before any real-PHI use (spec Non-Goals + F1/F5):** no behavioral-health data leaves the device and no clinician review queue exists until **F1** (HIPAA backend + BAA + encryption + access controls, with 42 CFR Part 2-aware segregation for substance-use data) and the **F5** legal read on the escalation rules both clear. P0 is explicitly device-only.

**Specific P0 safety verification:** `primaryClinicPhone` must be current — a stale number makes the crisis card's "call your clinic" action misfire (a safety defect). Add a confirmation prompt for it at consent time (P0-B1/P0-CRISIS6). **988 and emergency must never depend on that field being present.**

---

## 9. Risks, Open Questions & Decisions Needed

- **[REGULATORY — human decision, gates patient exposure]** The not-responding/deterioration `soft_escalate` rules edge toward regulated SaMD. F5's legal read must confirm the "surface data + route to a human, no autonomous directive" design stays non-device-CDS before these rules reach real patients. **Owner: regulatory/clinical counsel (F5).** Build/test on the prototype is fine; PHI exposure is not, until this clears.
- **[SEQUENCING — the sharpest one] Full crisis backbone in P0 hard-blocks the whole feature on the unmerged F4.** Spec 01 deliberately deferred *its* PHQ/self-harm path to P1 to avoid depending on F4 in P0. This feature cannot — crisis *is* the feature — so **the P0-CRISIS milestone cannot land until `task_e569880c` merges.** P0-A (deterministic core) is genuinely independent and should proceed in parallel, but the plan must not pretend crisis can ship without F4. **Decision: accept the F4 gate on P0's crisis half, or pull `task_e569880c` forward / co-own it.**
- **[SAFETY — engineering, non-negotiable]** Free-text crisis detection is **incomplete** (obfuscated/negated ideation). Item-9 is the primary structured net; free-text is supplementary. Copy must never claim completeness; the residual risk is disclosed at consent. No decision — a hard constraint the tests + copy enforce.
- **[ENGINEERING — audit durability]** Should the `crisis_escalated` audit be written at the gate seam (guaranteed, but couples the pure gate to audit) or at the UI (decoupled, but skippable)? This plan chose the seam for legal defensibility. **Decision: confirm the seam, or add a UI-level integration test that fails if the audit is ever missing.**
- **[ENGINEERING — F3 union collision]** P0 adds three `AuditEvent["action"]` strings while F3 independently extends the same union + adds `actor`. P0 uses the current anonymous 3-arg `recordAuditEvent`. **Decision: land the three strings in P0 and reconcile with F3 at merge, or wait for F3.**
- **[REGULATORY — HIPAA / 42 CFR Part 2]** Behavioral + substance-use data is especially sensitive; any P1 backend must segregate Part 2 data with Part 2-aware consent. Blocks P1, not P0. **Owner: privacy/legal + F1.**
- **[LEGAL — duty to warn]** Does surfacing item-9 to a P1 care-team queue create duty-to-warn obligations, and how fast must the queue respond? **Owner: legal. Blocks the P1 queue.**
- **[CLINICAL — alert fatigue]** Over-sensitive thresholds flood a future queue; they are module constants precisely so they can be clinician-tuned, and need validation against real panels before P1 scale-out. **Owner: clinical, before P1.**
- **[CONTENT — licensing, FR-18]** PHQ-9/GAD-7 are free; ship standard wording and record confirmation. The loneliness measure is deferred to P1 to defer its licensing question. **Owner: product/legal at P1.**

---

## 10. Effort & Sequencing Estimate

| Milestone | Size | Notes |
|---|---|---|
| **P0-A** Deterministic core (instruments, scoring, trend, escalation evaluators, reducer/storage) | **M** | Pure functions + type/storage plumbing; well-templated by `adherence.ts` + the dose reducer/storage tests. Starts **immediately**, in parallel with the F4 merge wait. Instrument-wording review adds calendar, not code, time. |
| **P0-CRISIS** Crisis backbone (bind F4, item-9 plumbing, ordering/bypass/no-burial/audit tests, resource surface) | **M** | Small code surface (a branch condition + one component + the item-9 plumbing) but the **highest-scrutiny** work; the Vitest suite is the bulk. **Gated on `task_e569880c` merge.** |
| **P0-B** Patient surface + brief + routing (with ranking guard) + care-team message + i18n | **M–L** | The `/behavioral` route + runner is the largest single piece; brief/tasks/care-team extensions are S each; the ranking-invariant test is small but load-bearing. |
| **P1** Coaching modules + review queue | **L** | Sonnet coaching + AUDIT-C/loneliness + **backend (F1) + actor (F3)**. Separate sprint. |
| **P2** FHIR/CoCM/analytics | **XL** | Per-EHR integration + cohort analytics. Separate initiative. |

**Suggested build order:**
1. **Now (parallel with F4 wait):** P0-A1 → A2 → A3 → A4 → A5 → A6. Delivers the entire deterministic core with tests; needs nothing from the gate.
2. **On `task_e569880c` merge:** P0-CRISIS0 (bind) → CRISIS1 (item-9 plumbing) → CRISIS2 (ordering) → CRISIS3 (bypass) → CRISIS4 (no-burial) → CRISIS5 (free-text net) → CRISIS6 (resource surface) → CRISIS7 (audit-at-seam). Tests alongside each step.
3. **Then:** P0-B1 (consent) → B2 (runner) → B3 (Today + ranking guard) → B6 (soft-escalate banner) → B4 (care-team message) → B5 (brief) → B7 (i18n parity). Re-run the full safety suite after every gate edit (B6 touches the gate).
4. **Ship gate:** `npm run check` green (all safety-regression + new crisis Vitest tests) **and** `npm run test:e2e` green; then hold real-PHI exposure until **F1 + F5** clear.

**Two load-bearing decisions to preserve (spec footer):** (1) the crisis-path **Vitest** guarantees live in `npm run check` and block merge (the Playwright e2e is an additional release gate, not the merge gate); (2) `crisis_escalate` is the **first branch** of `decideSafety()`, ahead of the stored-reading (`recentClinicalReading`) block — a co-occurring dangerous reading can never demote a suicidality disclosure. Both are locked by the ordering test in P0-CRISIS2.
