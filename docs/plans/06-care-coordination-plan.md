# Implementation Plan — Care-Coordination Quarterback (Transitions & Referral Loops)

> **Lifecycle: Parked (2026-07-20). No coherent implementation began.** Do not restart clinician or multi-patient work until a HIPAA-grade backend, patient-scoped authorization, actor-bearing audit, and regulatory-copy review are complete. Any restart must be a new plan against the then-current server architecture.

**Spec:** `docs/specs/06-care-coordination.md`
**Plan location:** `docs/specs/06-care-coordination-implementation-plan.md` (the `docs/specs/` directory exists with `docs/plans/00-foundations.md` + `01..07`; the spec footer that says "no `docs/specs/` exists" is stale — ignore it).

> **Reviewer's note on fidelity.** Every file path and symbol below was re-verified against live source on this branch. Five load-bearing corrections were made to the prior draft; they are called out inline as **[CORRECTION]** so the developer does not trip on them.

---

## 0. Corrections to the prior draft (read first)

1. **[CORRECTION] `shiftDateKey` is NOT exported** from `src/domain/adherence.ts` — only `toDateKey` is (lines 5–17; `shiftDateKey` is module-private at line 12). P0-2 must **export `shiftDateKey`** from `adherence.ts` (preferred — it is pure and already correct) or re-implement the same DST-safe local-date math in `referral-loop.ts`. Do not `import { shiftDateKey }` as-is; it will not resolve.
2. **[CORRECTION] Storage migration must back-fill BEFORE the core guard, and the new array guards belong in `isValidAppState`, not `isValidCoreAppState`.** `loadStoredState()` back-fills `mealLog`/`doseEvents` at **lines 484–489**, *then* calls `isValidCoreAppState()` (line 490). `isValidCoreAppState` runs `hasValidRelationships` and is the reset-to-demo gate. If the four new fields are added as required checks *inside* `isValidCoreAppState`, **every legacy stored state resets to demo (data loss)**. Follow the exact `mealLog`/`doseEvents` precedent: back-fill `externalEvents/referrals/referralEvents/reconciliations` to `[]` at lines 484–489, and put the array-shape guards in **`isValidAppState`** (lines 456–470) alongside the `tasks`/`mealLog`/`doseEvents` checks, with sanitize-and-drop for patient-mismatched rows.
3. **[CORRECTION] Photo → structured facts is not a deterministic path in P0.** `extractInstructionFacts()` (`src/domain/instructions.ts`) is a **regex parser over pasted `rawText`** — there is no OCR and no vision step. `useFoodCamera().grabFrame()` returns a base64 frame that today feeds the **realtime vision LLM** (`src/app/food/page.tsx:52`), never `extractInstructionFacts`. There is **no photo→text bridge** in the repo. Therefore in P0: (a) the **deterministic, offline** capture path is **manual structured entry** of an `ExternalCareEvent` (typed fields) + optional paste-through `extractInstructionFacts` for free-text discharge notes; (b) photo capture, if included in P0, is explicitly an **LLM-vision extraction** that only works under the mock provider with seeded output — it is **not** claimed deterministic and **not** "intake extraction." Do not write an AC that asserts "photographing a sheet deterministically produces facts."
4. **[CORRECTION] "Shortness of breath" / "trouble breathing" ALREADY hard-escalate.** `urgentSymptomPatterns` in `src/domain/safety.ts` (lines 23–33) already contains `/shortness of breath/i` and `/trouble breathing/i`, and `classifySafety` returns `escalate` for them, which `decideSafety` turns into `hard_escalate` at `safety-gate.ts:84–86`. So Flow-3's "I'm more short of breath since I got home" is **already covered**. P0-6 must add only the **genuinely new** post-discharge phrasings (leg/ankle **edema/swelling**, **weight gain since discharge**, **can't lie flat / orthopnea**, **waking short of breath**) and the test must not re-assert existing coverage as if it were new.
5. **[CORRECTION] F9 (i18n parity) is BLOCKING for this feature's copy, not "helpful."** Today there is exactly **one** catalog (`foodLensStrings`) and one `t()`, and `strings.test.ts` (lines 20–26) parity-checks only that catalog. A second EN/ES catalog with a parity gate is **impossible** without either the F9 generalization (register multiple catalogs; loop the parity test) or polluting `FoodLensStringKey`. Reclassified below as a small **blocking P0 slice** (like the F3 slice), not optional.

---

## Foundations dependencies (`docs/plans/00-foundations.md`)

| F# | What it gives this feature | Blocking? | This plan's stance |
|---|---|---|---|
| **F1** — HIPAA backend | Server persistence, auth, per-patient scoping for the clinician queue + ADT | **Blocking for P1**, avoided in P0 | P0 stays single-patient, manual/photo, local-first; **P1 hard-gated on F1**. |
| **F3** — `AuditEvent.actor` + action-union | Records who/why for every coordination mutation (FR-4, FR-13) | **Blocking for P0** | Consumes F3's `actor: {kind; id}` + optional `reason` + extended `action` verbs. If F3 hasn't merged, land the **minimal F3 slice** as P0-0 (§2). Do not fork the shape. |
| **F4** — crisis gate (`task_e569880c`) | Tier order + exported crisis/care-team action constants | **Blocking for the safety slice's final shape**; P0 can build against today's shape then rebase | Insert red-flag phrasings **below** `crisis_escalate`; **import** the exported action constants — never hard-code `["call_clinic","draft_message"]`. Do **not** assume today's `CARE_TEAM_ACTIONS` name/shape survives (§2, §7). |
| **F5** — reg posture + `SourceCitation` | Legal/clinical copy review of the SaMD-boundary strings (FR-9) | **Blocking at P1** (first "recommending"-adjacent surface) | Every reconciliation + transition-summary string held for F5 review before P1 exposure. P0's patient card + generic summary inherit F5's "present-and-label, never recommend" rule. |
| **F6** — `Condition` union / lens checklist | `heart_failure` condition + a post-discharge lens (FR-16) | **Blocking for HF-class summaries**; deferred with a documented generic fallback | P0 ships the generic fallback. The HF "weight-trend monitoring" logic does **not** fit the food-shaped `ConditionLens` type — it lives in a new monitoring/threshold layer (P1), not `condition-lens.ts` alone. |
| **F8** — care-team return channel | The clinician confirm/close event that makes "loop closed" *true* + the measured metric | **Blocking for the close metric** (P2); lifecycle states modeled locally P0/P1 | P0/P1 model states; the *measured* closure metric rides F8. |
| **F9** — i18n parity gate | Multi-catalog registration + looped parity test | **Blocking for the coordination string catalog** (see §0.5) | Land the small F9 test-generalization as a P0 slice **or** fold coordination keys into the existing catalog; do not claim a registry that isn't there. |
| **F10** — clinical dataset registry | Versioned/cited home for HF weight bands + duplicate-med rule | **Blocking for HF thresholds + duplicate-med notice** (P1) | P0 uses hard-coded aging defaults in `referral-loop.ts`; HF/clinical bands wait for F10 + F5 `SourceCitation`. |

---

## 1. Objective & P0 Definition of Done

**Objective.** Turn between-visit noise into tracked, pre-triaged, human-approved coordination work — detect external care events, track every referral to closure as a stateful loop, route transitions to a human for reconciliation. It **coordinates; it never diagnoses, prescribes, doses, or triages symptom acuity.**

**P0 is deliberately thin: it ships entirely on the current localStorage prototype — single-patient, no backend, no ADT feed, no clinician surface.** It is independently valuable: even manual single-patient loop-tracking prevents referral leakage and demos the whole loop offline.

**P0 Definition of Done (acceptance criteria):**

1. **Referral loop as pure client logic.** `Referral` + `ReferralEvent` in `AppState`; created (`ordered`), advanced `ordered → scheduled → seen → note_received → reconciled → closed` (+ terminal `patient_declined`/`cancelled`) via reducer actions; **no state advances without an explicit human-supplied `to`** (FR-4). `getReferralAging(referral, today)` returns days-in-current-state using the exported `toDateKey`/`shiftDateKey` math.
2. **Aging surfaces a task.** `buildTodayTasks(state)` emits a loop-closure `TaskItem` at threshold (defaults: not-scheduled >14d; no-note >10d post-visit), slotted into the existing priority scheme **without ever displacing an existing priority-1 safety task** given `MAX_TODAY_TASKS = 3` (FR-5, FR-8).
3. **Manual event capture (deterministic).** An `ExternalCareEvent` can be entered via typed structured fields; free-text discharge notes may be run through `extractInstructionFacts` (paste path). Every extracted fact carries `EvidenceStatus = "imported"`/`"needs_review"` and requires human confirmation before promotion to `confirmed` (FR-1, FR-12). **Photo capture is P0-optional and LLM-vision-backed (mock-seeded only) — see §0.3.**
4. **Deterministic transition summary (generic fallback).** `buildTransitionSummary(event, state)` deterministically *presents and labels* source-reported facts (reason, new/changed meds as reported, stated follow-up window) and **contains no recommendation verb** (FR-3). HF-class events use the generic fallback (FR-16) — no HF lens claimed in P0.
5. **Patient-facing transition card.** The Today feed / `/transitions` renders a plain-language "what happened and what's next" card in the patient's `language` (EN + ES) when an external event is attached (FR-10).
6. **Safety-gate extension (escalate-only, additive).** `classifySafety()` gains **new** post-discharge red-flag phrasings (edema/leg swelling, weight gain since discharge, orthopnea, waking short of breath — **not** the already-covered "shortness of breath") routing to the existing **hard-escalate** banner + care-team actions; **zero** new answering behavior (FR-11). Med-reconciliation phrasings continue to `blocked → soft_block` with no dosing guidance.
7. **Audit with actor.** Every new coordination mutation writes an `AuditEvent` carrying F3's `actor` (P0: `patient` for patient actions, `system` for reducer-automatic) via `recordAuditEvent()` — **never inline-constructed** (FR-13).
8. **Storage round-trips + safe migration.** New `AppState` fields serialize, validate, and survive reload; **legacy state lacking them back-fills to `[]` at lines 484–489 and never resets to demo** (§0.2).
9. **Health brief extended.** `buildHealthBrief(state)` gains a "Transitions & Open Loops" section with evidence labels (FR-14), empty-safe when none.
10. **All existing safety-regression suites stay green** (`safety.test.ts`, `safety-gate.test.ts`, `safety-dose-change.test.ts`); new deterministic logic has Vitest coverage; `npm run check` passes.

**Not in P0:** ADT ingestion, patient-matching/quarantine, the clinician Coordination queue, Haiku triage/batching, the HF lens, TCM flagging, reconciliation *verdict* logic (never — SaMD boundary), any backend, and any **deterministic** photo→facts pipeline.

---

## 2. Prerequisites & Dependencies

**BLOCKING for P0:**

- **F3 audit-actor slice.** If F3 hasn't landed, P0-0 lands the minimal slice: add `actor: { kind: "patient"|"clinician"|"system"; id: string }` (+ optional `reason`) to `AuditEvent` (`types.ts`); extend `recordAuditEvent()` (`audit.ts`) to accept/stamp it (default `{kind:"system",id:"reducer"}`); update **all 11** `recordAuditEvent(...)` call sites in `store.tsx` (lines 46, 55, 63, 72, 79, 92, 118, 132, 140); extend `isAuditEvent()` (`storage.ts` 346–360) for `actor`/`reason` + new action strings; migrate legacy events to `system` actor. **Coordinate with F3's owner — do not fork.**
- **F9 i18n slice (§0.5).** If F9 hasn't generalized `strings.ts`, either (a) land the tiny F9 slice (register multiple catalogs; loop `strings.test.ts` over all catalogs) as P0-0b, or (b) add coordination keys into the existing `foodLensStrings`/`FoodLensStringKey`. Option (a) is preferred and is explicitly cheap per F9. Do not ship a second catalog with no parity gate.

**BLOCKING for P1 (not P0):** F1 (backend), F5 (copy review), F6 (`heart_failure`), F8/F10 (metrics + clinical bands).

**In-flight crisis pathway — `task_e569880c` (F4).** P0's red-flag phrasings are additive to `classifySafety()` and flow through the existing `inputSafety.level === "escalate"` path at `safety-gate.ts:84`. **P0 may build against today's gate** and rebase onto the merged crisis shape. Two hard rules: (1) the new phrasings sit **below** `crisis_escalate` in the documented tier order; (2) once `task_e569880c` merges, the response actions must come from the **exported** constant (whatever it is renamed to), not a hard-coded array. The ordering test (§7) locks in that a post-discharge dyspnea/edema disclosure cannot be demoted by a co-occurring dangerous vital.

**External (P1+):** ≥1 real ADT/HIE or FHIR `Encounter`/`MedicationRequest` webhook partner (critical path); BAA/no-retention LLM tier before any PHI touches Haiku/Sonnet; HIPAA-eligible hosting (F1).

**No new devices for the core loop.** Camera reuse is document-scanner-only (and see §0.3); HF daily-weight scale ingestion is **P2** (F7).

---

## 3. Architecture & Approach

**Data flow (P0):**

```
Manual structured entry ─┐
(typed ExternalCareEvent) ├─► ExternalCareEvent (EvidenceStatus="imported"/"needs_review")
Paste discharge note ─────┘        │  (deterministic; extractInstructionFacts on free text)
[P0-optional] photo → LLM-vision   │  (mock-seeded only; NOT deterministic — §0.3)
                                   ▼
        buildTransitionSummary(event, state) ── DETERMINISTIC, domain/ ──► triaged, labeled paragraph
                                   │                                         (presents facts; never recommends)
                                   ▼
   Today/transitions card (EN/ES) ◄┤
                                   ▼
   Referral (ordered) ─► ReferralEvent[] ─► getReferralAging() ─► buildTodayTasks() loop-closure TaskItem
                                   │
   Coach asks about the transition ─► createSafeAiResponse() ─► decideSafety()
                                   │                    │
        classifySafety(): NEW post-discharge red-flag phrasings (edema/weight-gain/orthopnea)
        → hard_escalate  |  med-reconciliation phrasing → blocked → soft_block
        ("shortness of breath" already escalates today — §0.4)
```

**New modules (`src/`):**

| Path | Purpose |
|---|---|
| `src/domain/coordination-types.ts` | `ExternalCareEvent`, `ExternalEventType`, `Referral`, `ReferralState`, `ReferralEvent`, `ReferralBarrier`, `MedReconciliation`, `TransitionFlag`. Re-exported from `types.ts`. |
| `src/domain/referral-loop.ts` | `getReferralAging(referral, today)`, `canAdvanceReferral(from, to)` (legal-graph validator), `getReferralAgingThreshold()`. Mirrors `adherence.ts` date math; **imports the now-exported `shiftDateKey`** (§0.1). |
| `src/domain/transition-summary.ts` | **Deterministic** `buildTransitionSummary(event, state): { paragraph: string; flags: TransitionFlag[] }`. Client-side flags (new/changed med, follow-up window, duplicate-overlap notice) computed **before** any LLM, mirroring `food-flags.ts`. |
| `src/domain/coordination-drafts.ts` | `buildTransitionOutreach(state, event)` (PCP→patient, EN/ES) + `buildSpecialistNoteRequest(state, referral)` (PCP→specialist). Reuses the **pattern** of `care-team-message.ts`; **new functions, not a rewrite of `buildCareTeamMessage`**; no send path. |
| `src/app/transitions/page.tsx` | Patient-only surface: structured event entry, the transition card, referral create/advance. **No clinician surface in P0.** |
| i18n catalog | `coordinationStrings` (EN/ES) registered under the F9 multi-catalog convention (§0.5). |

**Existing modules to extend (verified symbols):**

- `src/domain/types.ts` — extend `AiMode` (`+"transition_summary"|"referral_status"`, currently 8 values at line 100); add the four `AppState` fields (lines 181–193); add F3 `actor`/action-union to `AuditEvent` (lines 127–133) if P0-0 owns it.
- `src/domain/safety.ts` — add `postDischargeRedFlagPatterns` used inside `classifySafety()` (lines 67–88). **BP thresholds (`hasDangerousBloodPressure`) and existing `urgentSymptomPatterns` are unchanged.** New phrasings widen the *escalate* set only; do not re-add already-present phrasings (§0.4).
- `src/ai/safety-gate.ts` — **no branch reorder in P0**; escalate phrasings ride the existing `inputSafety.level === "escalate"` path (line 84). Do **not** add reconciliation logic here; it flows through `medicationChangePatterns` in `classifySafety()`.
- `src/ai/intent.ts` — `inferAiMode()` (lines 5–29) gains transition/referral routing.
- `src/domain/tasks.ts` — `buildTodayTasks()` (lines 6–103) gains loop-closure + transition-follow-up tasks. **Respect `MAX_TODAY_TASKS = 3` and the `sort().slice(3)` at line 102 so a new priority-1 coordination task never truncates the existing priority-1 dangerous-vitals task** (see §0/AC-2, §7).
- `src/domain/health-brief.ts` — `buildHealthBrief()` (lines 7–98) gains the "Transitions & Open Loops" section following the existing `{ title, items, status }` section shape.
- `src/state/store.tsx` — new `HealthAction` cases + reducer arms; route all audits through `recordAuditEvent()` with F3 `actor`.
- `src/state/storage.ts` — new guards + `isValidAppState` wiring + back-fill migration per **§0.2** (not `isValidCoreAppState`); patient-scope + referral↔referralEvent referential sanitize in `hasValidRelationships`/a new sanitizer.
- `src/domain/labels.ts` — add `referralBarrierLabel()`, `referralStateLabel()`, `externalEventTypeLabel()` using the `Record<>`-map pattern of `barrierLabel`/`evidenceStatusLabel` (lines 3–28).
- `src/domain/adherence.ts` — **export `shiftDateKey`** (§0.1).
- `src/domain/condition-lens.ts` — **P1 only** (HF lens); P0 does not touch it.

**Deterministic vs. LLM boundary (critical, SaMD posture).** The referral state machine, aging, `buildTransitionSummary` fact assembly + `TransitionFlag[]`, the duplicate-med **overlap notice** (a neutral string, never a verdict), TCM-eligibility check (P1), and `classifySafety()` matching are **pure `domain/` functions — never LLM.** The LLM (P1) only *narrates* already-computed, already-labeled facts (Sonnet) or *classifies* signal (Haiku), always downstream of the deterministic layer and always through `createSafeAiResponse()`.

---

## 4. Work Breakdown (sequenced)

### Milestone P0 — Manual, patient-driven, local-first

- [ ] **P0-0 — F3 audit-actor slice** (only if F3 hasn't landed). Per §2. *Files:* `types.ts`, `audit.ts`, `store.tsx` (11 call sites), `storage.ts`. *AC:* existing audit behavior unchanged; `store.test.ts`/`storage.test.ts` green; legacy state (no `actor`) loads and back-fills to `system`.
- [ ] **P0-0b — F9 i18n slice** (only if F9 hasn't landed). Generalize `strings.ts` to register multiple catalogs; loop `strings.test.ts` (lines 20–26) over all registered catalogs; keep it under `npm run check`. *AC:* the existing `foodLensStrings` parity test still passes via the loop; adding a catalog with a missing ES key fails CI.
- [ ] **P0-1 — Coordination domain types.** Add the types in §5; add the four `AppState` fields. *AC:* strict-mode compile; every event/fact type carries `EvidenceStatus`.
- [ ] **P0-2 — Referral loop pure logic.** **First export `shiftDateKey` from `adherence.ts` (§0.1).** Then `getReferralAging(referral, today)`, `canAdvanceReferral(from, to)` (legal graph incl. terminals), `getReferralAgingThreshold()` (defaults 14d/10d, per-state). *Files:* `referral-loop.ts` (new), `adherence.ts` (export). *AC:* unit tests prove no illegal transition; terminals cannot advance; aging boundaries match `getAdherenceStreak`-style math; **no function advances without an explicit `to`.**
- [ ] **P0-3 — Reducer actions + audit.** `HealthAction` cases: `importExternalEvent`, `confirmExternalEventFact`, `createReferral`, `advanceReferralState` (rejects illegal via P0-2), `tagReferralBarrier`, `startMedReconciliation`, `confirmMedReconciliation`, `dismissCoordinationItem` (**requires `reason`**). Each writes `recordAuditEvent(patientId, <F3 verb>, label, actor, reason?)`. *AC:* illegal `advanceReferralState` is a no-op that logs nothing; dismiss without reason rejected; each accepted mutation appends exactly one audit event with the correct actor.
- [ ] **P0-4 — Storage guards + migration (per §0.2).** Add `isExternalCareEvent`/`isReferral`/`isReferralEvent`/`isMedReconciliation`; **back-fill the four fields to `[]` at lines 484–489** (before `isValidCoreAppState`); wire the shape guards into **`isValidAppState`** (lines 456–470); add sanitize-and-drop for patient-mismatched rows and dangling `referralEvent.referralId`. *AC:* state with new fields round-trips; legacy state loads and back-fills **without resetting to demo**; a referral with a mismatched `patientId` is dropped, not a hard reset.
- [ ] **P0-5 — Deterministic transition summary + flags.** `buildTransitionSummary(event, state)` assembles reason + meds-as-reported + follow-up window into a labeled paragraph and computes `TransitionFlag[]` (new-med, changed-med, follow-up-window, duplicate-overlap notice) **before any LLM**. HF-class → generic template (FR-16). Every fact prefixed with its `evidenceStatusLabel`. *AC:* snapshot proves the paragraph presents-and-labels and contains **no** recommendation verb (regex: `should|hold|take|stop|start|increase|decrease|recommend`); duplicate-med yields a neutral overlap notice.
- [ ] **P0-6 — Safety red-flag phrasings (escalate-only, additive).** Add **new** `postDischargeRedFlagPatterns` (edema/leg-ankle swelling, weight gain since discharge, orthopnea/can't-lie-flat, waking short of breath) to `classifySafety()`; **do not re-add** already-present phrasings (§0.4). Confirm med-reconciliation phrasings still hit `medicationChangePatterns → blocked`. **No new answering behavior; no branch above crisis.** *AC:* "swelling in my ankles since I got home from the hospital" → `escalate`; "should I keep taking my old water pill AND the new one?" → `blocked`; the pre-existing "shortness of breath" case still `escalate` (unchanged); full safety-regression suite green.
- [ ] **P0-7 — Intent routing + AiMode.** Extend `AiMode`; teach `inferAiMode()`; extend `isAiMode()` (`storage.ts` 188–199). *AC:* free-text about a recent discharge routes to `transition_summary`; `isAiMode` accepts new values; `intent.test.ts` extended.
- [ ] **P0-8 — Today tasks: loop-closure + transition follow-up.** Emit a transition-follow-up task within the post-discharge window and a loop-closure task at aging threshold, with a barrier prompt. **Guarantee the existing priority-1 safety task survives `sort().slice(MAX_TODAY_TASKS)`** — if this means the coordination follow-up is priority 1 too, ensure the safety-reading task is emitted/ordered first so it is never the one dropped (add an explicit tie-break or reserve a slot). *AC:* a 14-day-unscheduled referral surfaces "Cardiology referral open 14 days, not scheduled"; a day-2 post-discharge follow-up appears; **a state with both a dangerous reading and a fresh transition still shows the dangerous-reading task**; `MAX_TODAY_TASKS` respected.
- [ ] **P0-9 — Draft builders.** `buildTransitionOutreach(state, event)` (EN/ES) + `buildSpecialistNoteRequest(state, referral)`. Editable strings; **no send path** (like `buildCareTeamMessage`). *AC:* outreach renders in `es` for a Spanish-preferred patient; no function transmits anything.
- [ ] **P0-10 — Patient transition surface (`src/app/transitions/page.tsx`).** Structured `ExternalCareEvent` entry + optional paste-to-`extractInstructionFacts`; the transition card (EN/ES) rendering `buildTransitionSummary`; referral create/advance controls; `imported`/`needs_review` badges with confirm-to-promote. **Photo capture, if included, is explicitly LLM-vision (mock-seeded) and labeled as such — see §0.3; it is not on the deterministic offline path.** *AC:* structured entry produces a `needs_review` event; confirming promotes to `confirmed` and audits it; card shows in the patient's language; **the surface works fully with photo disabled.**
- [ ] **P0-11 — Health brief section.** "Transitions & Open Loops" with `EvidenceStatus` labels, empty-safe. *AC:* `health-brief.test.ts` asserts the section appears with correct labels when data exists and is omitted/empty-safe when none.
- [ ] **P0-12 — Fixtures + `npm run check`.** Register `coordinationStrings` (P0-0b); seed 2–3 demo events + a referral (incl. one aged past threshold) in `fixtures.ts`. *AC:* EN/ES parity passes; demo state loads with seeded events; `npm run check` (lint + test + build) green.

### Milestone P1 — ADT ingestion + clinician Coordination queue (needs F1, F5, F6, F10)
- [ ] **P1-1 — Backend graduation (F1).** Move the four arrays to per-patient server rows; server-side audit sink mirrors F3. *Blocked on F1.*
- [ ] **P1-2 — ADT ingestion.** HL7v2 (A01/A03/A04/A08) or FHIR R4 (`Encounter`/`MedicationRequest`/`DocumentReference`) → `ExternalCareEvent` (`EvidenceStatus="imported"`). Degrade to manual on outage.
- [ ] **P1-3 — Patient-matching + quarantine.** Low-confidence → quarantine for human matching, **never auto-attach, never drop** (FR-2). Haiku scores candidates (surfaced, never auto-applied).
- [ ] **P1-4 — Clinician Coordination queue (new UI).** Ranked (reuse `buildTodayTasks` priority scheme), low-signal batched/collapsed (FR-8); approve/adjust/dismiss; **dismiss requires reason, audited not deleted.**
- [ ] **P1-5 — Sonnet narration + reconciliation presentation UI (F5-gated).** Sonnet narrates P0-5's deterministic facts; reconciliation UI **displays** home vs. changed meds side-by-side with provenance + neutral overlap notices; human confirm to mark `reconciled`; **never computes interactions/verdicts/doses** (FR-9). **Every string held for F5 review.**
- [ ] **P1-6 — HF/post-discharge monitoring (F6 + F10).** Add `heart_failure` to `Condition` + `isCarePlan()` (`storage.ts:372`) + `selectLens()` + a lens **plus** a new weight-trend monitoring/threshold layer (the food-shaped `ConditionLens` cannot hold weight bands). HF bands from F10 with `SourceCitation`. *Atomic union+guard+lens change.*
- [ ] **P1-7 — TCM-eligibility flag (informational only).** No claim submission/coding (FR-15).

### Milestone P2 — Closed-loop + measurement (needs F8, F10, F7)
- [ ] **P2-1 — Consult-note return (F8)** flips loop to `note_received` → human confirm → `reconciled` → `closed`; closure event feeds the metric.
- [ ] **P2-2 — Pharmacy med-history cross-check** for reconciliation *display* (RxNorm, presentation only).
- [ ] **P2-3 — Community-resource routing** for `transport`/`cost` barriers.
- [ ] **P2-4 — Analytics** (loop-closure / 7-day follow-up / readmission / TCM), program-level, no feature-causation claims.
- [ ] **P2-5 — Scale/wearable ingestion (F7)** for HF daily weights.

---

## 5. Data Model & Storage Changes

**New types** (`src/domain/coordination-types.ts`, re-exported from `types.ts`):

```ts
export type ExternalEventType =
  | "ed_visit" | "inpatient_admit" | "inpatient_discharge"
  | "specialist_consult" | "urgent_care" | "outside_lab";

export type ExternalCareEvent = {
  id: string; patientId: string;
  type: ExternalEventType;
  occurredAt: string;                 // ISO
  sourceFacility: string;
  reportedMedChanges: { name: string; change: "new" | "changed" | "stopped"; asReported: string }[];
  statedFollowUpWindow: string | null;
  status: EvidenceStatus;             // "imported"/"needs_review" until confirmed
  matchConfidence: "high" | "low" | "quarantined";  // P0 events are "high" (patient-attached); P1 uses low/quarantined
};

export type ReferralState =
  | "ordered" | "scheduled" | "seen" | "note_received" | "reconciled" | "closed"
  | "patient_declined" | "cancelled";               // last two terminal

export type ReferralBarrier =
  | "not_scheduled" | "patient_declined" | "cost"
  | "transport" | "no_note_returned" | "specialist_no_capacity";

export type Referral = {
  id: string; patientId: string;
  specialty: string; reason: string;
  state: ReferralState;
  orderedAt: string; stateEnteredAt: string;        // for getReferralAging
  activeBarrier: ReferralBarrier | null;
  source: EvidenceStatus;
};

export type ReferralEvent = {
  id: string; referralId: string;
  from: ReferralState | null; to: ReferralState;
  actor: AuditEvent["actor"];                        // F3 actor
  barrier: ReferralBarrier | null;
  occurredAt: string;
};

export type MedReconciliation = {
  id: string; patientId: string; externalEventId: string;
  homeMeds: { name: string; provenance: EvidenceStatus }[];
  changedMeds: { name: string; change: string; provenance: EvidenceStatus }[];
  overlapNotices: string[];                           // neutral duplicate notices, NOT verdicts
  confirmedBy: AuditEvent["actor"] | null;           // null until human confirms
  reconciledAt: string | null;
};

export type TransitionFlag =
  | { kind: "new_med"; name: string }
  | { kind: "changed_med"; name: string }
  | { kind: "follow_up_window"; window: string }
  | { kind: "duplicate_overlap"; note: string };      // neutral, never a recommendation
```

> **Note:** `ReferralEvent.actor` and `MedReconciliation.confirmedBy` reference `AuditEvent["actor"]`, so these types **depend on F3 having added `actor` to `AuditEvent`.** Land P0-0 (or F3) before P0-1 compiles.

**Changed types:** `AppState` +4 arrays; `AiMode` +2 values; `AuditEvent` +`actor`/optional `reason` + coordination verbs (F3); `Condition` +`"heart_failure"` (**P1**).

**New reducer actions** (`HealthAction`): the eight in P0-3.

**Storage / serialization** — there is **no** `serialization.ts`; it is `JSON.stringify` + type guards in `storage.ts`. Per **§0.2**: back-fill the four fields at lines 484–489; put the new array guards in `isValidAppState`; extend `isAiMode` (188–199) and `isAuditEvent` (346–360, via F3); sanitize patient-scope + referral↔referralEvent integrity. **No data loss; no reset-to-demo on upgrade.**

---

## 6. AI / Model Wiring

**Deterministic in `domain/` — NEVER LLM:** referral state machine + `canAdvanceReferral`, aging, `buildTransitionSummary` + `TransitionFlag[]`, the duplicate-med **overlap notice**, TCM-eligibility (P1), and `classifySafety()` matching. These are the safety-load-bearing paths; keeping them out of the model is the SaMD posture (FR-9).

**Haiku (P1, high-volume classification):** ADT signal triage, patient-match candidate scoring (**surfaced, never auto-applied** — FR-2), referral-state inference *from returned documents* (**surfaced, never auto-applied** — FR-4), batching.

**Sonnet (P1, analysis/generation):** transition-summary *narration* of already-computed facts, reconciliation *presentation* narrative (descriptive, never prescriptive — FR-9), drafted-message polish, the brief's "Transitions & Open Loops" prose.

**Streaming:** patient coach + any real-time care-team drafting; batch summaries need not stream.

**Flow through the gate.** Every patient-facing coordination answer goes through `createSafeAiResponse(request, provider)` → `decideSafety()`:
- New post-discharge red-flag phrasing → `classifySafety()` returns `escalate` → **hard-escalate; provider never called** (`safety-gate.ts:84–86`, 115–122).
- Med-reconciliation phrasing → `blocked` → `soft_block`: answers the safe part, attaches banner + care-team actions, **no dosing guidance** (lines 96–102, 130–140).
- Otherwise `allowed` → provider narrates the deterministic summary.

`HealthAiProvider` is unchanged (new modes/prompts, not a new contract); the **mock provider keeps the demo path offline** with seeded events. `healthAiSystemPrompt` (`src/ai/prompts.ts:3`, versioned `HEALTH_AI_SYSTEM_PROMPT_VERSION`) boundary language **applies unchanged and governs.**

---

## 7. Testing Strategy

**Vitest unit (deterministic, safety-critical — the acceptance bar):**
- `src/domain/referral-loop.test.ts` (new): every legal transition allowed; **every illegal transition rejected**; terminals cannot advance; aging boundary math; **no path advances without an explicit `to`.**
- `src/domain/transition-summary.test.ts` (new): paragraph presents-and-labels every fact with its `EvidenceStatus`; **contains no recommendation verb** (regex `should|hold|take|stop|start|increase|decrease|recommend`); duplicate-med → neutral overlap notice; HF event → generic fallback (FR-16).
- `src/domain/safety.test.ts` (extend): the **new** post-discharge phrasings (edema/weight-gain/orthopnea) → `escalate`; med-reconciliation phrasings → `blocked`; **assert the pre-existing "shortness of breath"/"trouble breathing" cases are unchanged (§0.4)**; existing BP-band + urgent-symptom cases unchanged.
- `src/ai/safety-gate.test.ts` (extend) — **the ordering test that must stay green and gains a case:** a request with *both* a post-discharge dyspnea/edema disclosure **and** a co-occurring dangerous stored vital resolves to the higher tier and never demotes the disclosure; **all existing hard/soft-escalate + soft-block regression cases stay green.** Once `task_e569880c` merges, assert the disclosure sits **below** `crisis_escalate` and the actions come from the exported constant, not a literal.
- `src/domain/tasks.test.ts` (extend): aging referral surfaces the loop-closure task; day-2 post-discharge follow-up appears; **a state with a dangerous reading + a fresh transition still returns the dangerous-reading task after `slice(MAX_TODAY_TASKS)`** (the §0/AC-2 truncation guard); `MAX_TODAY_TASKS` respected.
- `src/state/store.test.ts` / `storage.test.ts` (extend): each new reducer action audits with correct actor; `dismissCoordinationItem` requires a reason; new fields round-trip; **legacy state (missing fields, missing actor) migrates without loss and without reset-to-demo (§0.2).**
- `src/domain/health-brief.test.ts` (extend): section shape + labels; empty-safe.
- `src/i18n/strings.test.ts` (extend via F9): `coordinationStrings` EN/ES parity via the looped test.

**Playwright e2e (`test:e2e`):**
- *Referral loop-closure (Flow 2):* create cardiology referral → tag `transport` → advance to `scheduled` → aging task appears at threshold → advance to `closed`.
- *Transition of care (Flow 3, patient side):* attach a discharge event via structured entry → Today/`/transitions` shows the plain-language card (assert ES for a Spanish patient) → confirm a `needs_review` fact promotes to `confirmed`. **Photo capture excluded from the deterministic e2e (§0.3).**
- *Coach safety (Flow 3.3):* "keep taking my old water pill AND the new one?" → banner + care-team actions, **no dosing text**; "swelling in my ankles since I got home" → hard-escalate, **no assessment**.

**Safety-regression gate:** full existing `safety.test.ts` + `safety-gate.test.ts` + `safety-dose-change.test.ts` stay green. `npm run check` (lint + test + build) is the P0 merge gate.

---

## 8. Rollout, Flags & Verification

**Env toggles (env only — no flag framework):**
- `HEALTH_AI_PROVIDER=mock` (default) runs the entire P0 slice offline with seeded events — the demo/verify path; no key required.
- `HEALTH_AI_PROVIDER=openai` + `HEALTH_AI_API_KEY` enables the live provider (P1 narration) — **only over a BAA/no-retention tier once real PHI is involved (F1/F5 gate).**
- P0 needs **no** new env vars; P1 adds ADT/HIE credentials + F1 backend config.

**Verify P0 on the local prototype:**
1. `npm run dev`, default mock provider (seeded events from `fixtures.ts`).
2. Open `/transitions`: the seeded discharge event renders a plain-language, evidence-labeled card (switch a demo patient to `language:"es"` to verify Spanish).
3. Create a referral, advance it, cross the 14d threshold (or use the seeded aged referral) → the loop-closure task appears on `/today`, **alongside** any dangerous-vitals task.
4. In the coach, run the two safety phrasings → confirm hard-escalate (edema/weight-gain) and soft-block (reconciliation) with the banner + actions.
5. Reload → all coordination state persists; open `/privacy` → each action recorded with an actor. Add a legacy state blob missing the four fields → confirm it loads (back-filled) and does **not** reset to demo.
6. `npm run check` green.

**Hard stop before any real-PHI use:** No clinician surface, ADT ingestion, or multi-patient data may touch real patients before **F1** (HIPAA backend + BAAs) **and F5** (reg posture + reconciliation/summary copy review) land. P0 is fixture/demo-only by construction and never sees PHI. (Cross-cutting F00 gate: "no clinician/multi-patient feature reaches real PHI before F1 + F3.")

---

## 9. Risks, Open Questions & Decisions Needed

**Needs a human (clinical / regulatory / product):**
- **SaMD boundary on reconciliation + summary copy (FR-9, F5).** Every such string legally/clinically reviewed against current FDA CDS guidance before P1. The moment copy reads "these interact — hold X" or "recommend dose Y," it crosses into device territory. *Owner: counsel + clinical lead. Blocking for P1.*
- **HF is unmodeled (FR-16, F6),** and the weight-trend logic does **not** fit the food-shaped `ConditionLens` — it needs a separate monitoring layer. *Decision: is the HF lens+monitoring in this feature's P1 or a shared F6 item?* Until it lands, HF discharges get the generic (still-safe) fallback. **Do not demo an HF lens that doesn't exist.**
- **Backend ownership (F1).** *Decision (per F00): treat "the app has a server" as a shared platform prerequisite; this feature is the first consumer, not the owner.*
- **ADT/HIE partner** — the single biggest external dependency and P1 critical path. *Decision: regional HIE vs. one facility's FHIR webhooks?*
- **Alert fatigue** — if triage precision <85%, clinicians ignore the queue and the product fails. *Decision: shadow period where the RN, not the physician, sees everything first.*
- **Queue operator role** (RN/MA/physician) varies — support role-based routing (needs F3 actor + F8).
- **TCM false-claim exposure (FR-15)** — confirm informational-only flagging creates no false-claim risk. *Owner: compliance.*

**Open technical:**
- Per-state aging thresholds (FR-5): hard-coded defaults in `referral-loop.ts` for P0; move to F10 registry with `SourceCitation` when F10 lands.
- Photo→facts fidelity (§0.3): P0 does not rely on it. If P1 adds vision extraction of discharge sheets, treat OCR/vision output as `needs_review` and validate discharge-sheet layouts before any downstream use.

---

## 10. Effort & Sequencing Estimate

| Milestone | Size | Notes |
|---|---|---|
| **P0** total | **M–L** | All client-side. Bulk is types + reducer + guards + deterministic summary + one patient surface. |
| P0-0 / P0-0b (F3 + F9 slices) | S each | Only if those foundations haven't landed; coordinate to avoid forking. |
| P0-1..P0-4 (types, loop, reducer, storage) | M | Load-bearing core; do first, in order. **P0-2 exports `shiftDateKey`; P0-4 follows the §0.2 migration ordering.** |
| P0-5..P0-7 (summary, safety, intent) | S–M | Safety phrasings are small but must clear the regression suite; add **new** phrasings only. |
| P0-8..P0-12 (tasks, drafts, surface, brief, fixtures) | M | The patient surface (P0-10) is the largest single UI piece; the task-truncation guard (P0-8) is subtle. |
| **P1** total | **XL** | Gated on F1/F5/F6/F10; ADT + matching + clinician queue is the bulk. |
| **P2** total | **L–XL** | Closed-loop + analytics; independently schedulable. |

**Build order:** P0-0/P0-0b → P0-1 → P0-2 → P0-3 → P0-4 (model + reducer + storage solid and tested) → P0-5/P0-6/P0-7 (deterministic summary + safety; run the regression suite early) → P0-8/P0-9 → P0-10 (surface) → P0-11/P0-12 (brief + fixtures + `npm run check`). Ship P0 as an independently valuable, offline, single-patient loop-tracker. **Do not begin P1 until F1 + F5 land.**
