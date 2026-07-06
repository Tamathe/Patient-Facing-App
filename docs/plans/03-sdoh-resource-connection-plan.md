# Implementation Plan — Social Determinants Screening & Resource Connection (Food-is-Medicine)

**Spec:** `docs/specs/03-sdoh-resource-connection.md`
**Foundations dependencies:** `docs/plans/00-foundations.md`

> **Reviewer corrections applied to the draft (all verified against live source):**
> 1. **`crisis_escalate` does not exist in the codebase.** The real `SafetyDecision` union in `src/ai/safety-gate.ts:9-13` is `hard_escalate | soft_escalate | soft_block | allowed`. `grep` over `src/` returns **zero** hits for `crisis_escalate`, `call_988`, `call_911`, `CRISIS_ACTIONS`, `988`, or `911`. Every draft instruction to "insert below `crisis_escalate`" referenced a symbol `task_e569880c` has **not yet merged**. P0-5 is now written to be **hard-blocked on that merge** OR to ship as a self-contained `hard_escalate` that is re-tiered later — never against a phantom branch.
> 2. **The draft's ordering AC was architecturally false.** In the real `decideSafety()` (`safety-gate.ts:39-105`), the stored-reading (48-70) and latest-reading (72-82) branches **`return` before** free-text `inputSafety` is evaluated (line 84). A material emergency living only in free-text is therefore **pre-empted** by a co-occurring dangerous stored vital — the draft's "neither demotes the other, at the branch level" claim is impossible. The test now asserts on **outcome** (`safety === "escalate"`), not on which branch fired.
> 3. **911 text cannot live in `banner` on the escalate path.** The `hard_escalate` return (`safety-gate.ts:115-122`) sets `content`, `safety`, `sources`, `actions` — **no `banner` field**. `banner` is only set on the soft paths (137). FR-4's "explicit 911" text must go in the escalate **`content`/message**, not `banner`.
> 4. **`HealthBrief` sections carry one `status` per section, not per item** (`types.ts:120-124`, `health-brief.ts:57-97`). "Per-item `EvidenceStatus`" (FR-12) is not representable without either splitting mixed-status needs into separate sections or changing the `HealthBrief` type. Resolved below.

| Foundation | Blocking? | Why / feature-specific delta |
|---|---|---|
| **F1 Backend** | Blocking for real-PHI referral egress; **not** for the P0 local slice | Sending PHI to findhelp/Unite Us is a `shared` PHI-egress event requiring a BAA + server audit. **P0 ships local-first with a seeded/mock adapter and transmits zero real PHI**, so P0 is not blocked on F1. The moment a live network adapter sends one real patient field, F1 (+ BAA) is hard-blocking. |
| **F3 Audit actor** | Helpful for P0; blocking for the CHW terminal-confirm loop (P1) | Reducer auto-audits with a `system` actor today (there is no `actor` field at all yet — `AuditEvent` = `{id, patientId, action, label, createdAt}`, `types.ts:127-133`). Patient-side screen/consent events are fine as `system`. Terminal `enrolled/received` confirmation (FR-7) needs the F3 actor + an action verb — that is F8-on-F3, deferred to P1. |
| **F4 Crisis gate** | **Blocking for the escalation-tier ordering only** (see P0-5); **not** blocking a self-contained material-emergency `hard_escalate` | P0 adds *material*-emergency patterns and a branch to the deterministic gate. **The tier position relative to a future `crisis_escalate` branch is owned by `task_e569880c` and does not exist yet.** P0 ships the material emergency as a `hard_escalate` (a tier the current gate already supports), then re-tiers it under crisis **after** `task_e569880c` merges. **P0 ships NO SI/mood/IPV item** (FR-16). Import `CARE_TEAM_ACTIONS` from `safety-gate.ts`; do not hard-code the array; do not invent a crisis action. |
| **F5 Reg/provenance** | Blocking at the first patient-facing "recommending" surface | Z-code *suggestion* and resource matching must stay non-device (surface + route to a human, never auto-code). Reuse `EvidenceStatus`; hang F5 `SourceCitation` on the public-charge copy and the Z-code map. The regulatory-posture doc must classify "SDOH screen + resource routing + Z-code suggestion" as non-device before patient exposure. |
| **F6 Condition union** | Helpful; P1 only | Food-is-Medicine procurement (P1) reuses `selectLens()` (`condition-lens.ts:139-149`); hypertension is fully populated, `diabetesLens`/`obesityLens` are genuine stubs (`nutrientRules: []`, `medDietRules: []`, lines 121-137). P0 does no procurement. |
| **F8 Return channel** | Blocking for loop closure (P1) | "Closed-loop" is false without a human closing it. P0 tracks lifecycle up to `sent`/`contacted`; the terminal `enrolled/received` confirm requires F8 (clinician confirm/close on F1+F3). Deferred to P1. |
| **F9 i18n parity** | **Blocking** | Every screen item, resource card, and public-charge string ships `en`/`es` from day one. Requires F9's generalized multi-catalog parity test. Today `strings.test.ts:20-26` covers **only `foodLensStrings`**; this plan generalizes it (P0-1a) and registers a new `sdohStrings` catalog. |

---

## 1. Objective & P0 Definition of Done

**Thin, shippable slice:** A patient is prompted with a validated *material-needs* screen (PRAPARE-core + Health Leads food/housing/utilities/transport/financial items), answers in EN or ES, and on submit sees a deterministic, plain-language summary of flagged needs each tied to a clinical reason, with a specific local resource per need (from a **seeded** directory) they can consent to and "connect." The connection queues a `sent` referral (audit `shared` + per-referral consent record). A material emergency ("no food today," insulin out with none left) hard-escalates through the safety gate — resource UI suppressed, escalation message carrying explicit 911 text — **before** any resource UI renders. A physician sees it in `buildHealthBrief()`'s new "Social needs & referrals" section with suggested Z-codes. Runs entirely on the localStorage prototype with `HEALTH_AI_PROVIDER=mock` and zero API keys.

**P0 Definition of Done (acceptance):**
1. A `kind: "social"` task appears in `today` and is **not** silently dropped by the `MAX_TODAY_TASKS = 3` slice (`tasks.ts:4,102`) (FR-11) — verified by the truncation test in P0-11.
2. Screen renders all material-domain items in `en` and `es`; each item is skippable and a decline is recorded, not dropped (FR-14); no SI/mood/IPV item exists anywhere in the item set (FR-1).
3. Each answer persists as a social-need fact carrying `EvidenceStatus` (`patient_reported`), reusing the `ExtractedFact` field shape (`types.ts:90-98`) (FR-2).
4. Flags computed **deterministically in `domain/` before any provider call** (FR-3); a Vitest unit test proves flag output for fixed inputs with zero provider calls.
5. Material-emergency phrases route through `createSafeAiResponse()` and hard-escalate: resource UI suppressed, **escalation `content` includes explicit "if this is an emergency, call 911" text** (not `banner` — the hard-escalate return has no `banner` field), `actions` = imported `CARE_TEAM_ACTIONS`, `buildCareTeamMessage` drafted (FR-4). The **outcome ordering test** (P0-5) proves: (a) a material-emergency phrase yields `safety === "escalate"`; (b) a co-occurring dangerous vital (SBP 182) also yields `escalate` — i.e., neither downgrades the escalation *outcome*; (c) a med-change phrase does **not** upgrade a material emergency's tier. The test asserts on the returned `HealthAiResponse.safety`/`content`, **not** on internal branch identity.
6. For each flagged need, a specific seeded resource shows hours/distance/eligibility; no static uncurated list is the primary path (FR-5). Empty-seed case returns the CHW-handoff sentinel and the UI says so — never a dead end (failure mode).
7. "Connect me" records a `sent` referral with an explicit per-referral consent record and an audit `shared` event, transmitting **zero** real PHI in P0 (data-minimization holds trivially — nothing leaves the device) (FR-6).
8. `buildHealthBrief()` renders "Social needs & referrals" with *suggested* Z55–Z65 codes marked "for physician confirmation," never auto-applied, **and** an explicit `EvidenceStatus` — see §5 for how per-item status is represented given the section-level-status constraint (FR-12).
9. All new mutations flow through the reducer and auto-audit via `recordAuditEvent()`; the audit trail exports/prints via the existing `/privacy` surface (FR-13).
10. `npm run check` green: lint + Vitest (incl. new deterministic/outcome-ordering/parity tests) + build.

**Explicitly NOT in P0** (deferred, matching spec Phasing): barrier→resource bridge (P0.5), produce Rx / Food Lens procurement (P1), SNAP/LIHEAP pre-screen (P1), CHW terminal-outcome confirmation + SLA re-surfacing (P1, needs F8+F3 actor), live findhelp/Unite Us adapter (needs F1+BAA), FHIR write-back (P2), any SI/mood/IPV screening (gated behind FR-16), and **any re-tiering of the material-emergency branch relative to `crisis_escalate`** (that step waits on `task_e569880c`).

---

## 2. Prerequisites & Dependencies

**Blocking for P0:**
- **F5 regulatory-posture doc** — must classify the SDOH screen + Z-code suggestion as non-device and clear a copy-review hold on the public-charge string before patient exposure. Cheap doc dependency; start immediately.
- **F9 multi-catalog parity test** — the generalized parity loop must exist so the new `sdohStrings` catalog is gated. If F9 has not generalized yet, this plan ships the generalization as **P0-1a** (small). This touches `src/i18n/strings.ts`, which multiple feature sprints also touch — coordinate the edit.

**Coordinated, but P0 can proceed without waiting:**
- **F4 / `task_e569880c`** — P0 ships the material emergency as a **self-contained `hard_escalate`**, which the current gate already supports (`safety-gate.ts:52,64,76,90`), so P0 is **not** hard-blocked on the crisis session. **Do NOT insert a branch "below `crisis_escalate`" — that branch does not exist yet.** After `task_e569880c` merges, a small P0.5/P1 follow-up (**P0-5b**) re-tiers the material-emergency branch to sit under the crisis tier and adds the crisis-vs-material ordering assertion. Confirm the merged action-constant export name and gate ordering before that follow-up.

**Deferrable / not needed for P0:**
- **F1 backend + BAA** — only when a *live* network adapter sends real PHI. P0's adapter is seeded/queue-only.
- **F3 actor field** — P0 uses `system`-actor audits (the current `AuditEvent` has no actor). The CHW confirm loop (P1) needs the actor + verb.
- **F8 return channel** — needed for terminal `enrolled/received` confirmation and SLA re-surfacing (P1).
- **F6 condition lenses** — only for P1 procurement mode.

**External dependencies (all P1+):** one closed-loop referral network (findhelp *or* Unite Us) API + data-sharing agreement; produce-Rx partner + voucher rail; a named human owner (CHW/coordinator) per clinic — the hardest non-technical dependency and a hard onboarding gate. **None are required to demo P0.**

---

## 3. Architecture & Approach

P0 is composition over existing primitives plus one new `social` domain and one state slice. The "nurse layer" pattern from Food Lens (`food-flags.ts`, `food-lookup.ts` — both verified present in `src/domain/`) is the template: **compute deterministic flags in `domain/` before any model call.**

### New modules (create)
- `src/domain/social-screen.ts` — item catalog keyed to `SocialDomain`, the deterministic flag engine `computeSocialFlags(answers)`, and the `answer → SocialNeedFact` mapper. **No LLM.** Mirrors `food-flags.ts`.
- `src/domain/social-resources.ts` — seeded directory + `matchResources(flag, patient)` degradation ladder (seed → [live adapter, P1] → CHW-handoff sentinel). Mirrors `food-lookup.ts`'s ladder (`resolveBarcode` cache→seed→live→null).
- `src/domain/social-zcodes.ts` — **deterministic, rule-based** `SocialDomain → Z55–Z65` suggestion map; returns *suggestions* flagged for physician confirmation. Never LLM.
- `src/domain/social-referral.ts` — `createReferral()` (status `sent`) and `advanceReferralStatus()` which **structurally rejects** `enrolled/received` unless the transition carries a `clinician` actor (P0 can only reach `sent`/`contacted`/`declined`).
- `src/domain/social-emergency.ts` — `classifyMaterialEmergency(input): SafetyClassification` returning the existing `{ level, response }` shape (`safety.ts:1-4`), with `level: "escalate"` and a `response` that **includes explicit 911 text** (911 lives in the escalate message, per correction 3). Kept in its own module so the clinically-reviewed patterns are reviewable in isolation; re-exported into the gate. *(Alternative: add patterns directly to `safety.ts`. Either is fine; keep the patterns net-new and clinically reviewed, not "reuse.")*
- `src/i18n/sdoh-strings.ts` — `SdohStringKey` union + `sdohStrings: Record<Language, Record<SdohStringKey, string>>`. Registered with F9's catalog registry. Note the existing `NutrientRule.flagKey` is typed `FoodLensStringKey`; the new union is **separate** and will not collide.
- `src/app/social/page.tsx` (route `/social` — confirmed absent today) — patient screen + summary + connect surface. This dedicated surface is also FR-11's answer for non-urgent social follow-ups.
- Components — home them consistently with the repo (there is no `src/components/` dir today; existing UI lives under `src/app/*`). **Decide component home before P0-14** (see Open Questions): either colocate under `src/app/social/` or introduce `src/components/`. Files: `social-screen-form`, `social-need-summary`, `social-resource-card`.

### Existing modules to extend
- `src/domain/types.ts` — add `SocialDomain`, `SocialScreen`, `SocialNeedFact`, `SocialReferral`, `ReferralStatus`, `ReferralConsent`; extend `TaskItem.kind` (`types.ts:77`) with `"social"`; add `AiMode` `"connect"` (`types.ts:100`); add `socialFacts`/`socialReferrals` to `AppState` (`types.ts:181-193`). **Do not add referral action verbs to `AuditEvent.action` in P0** — stay inside the existing closed union `created|updated|ai_generated|shared|exported|deleted` (`types.ts:130`); closed-loop verbs land with F3/F8 in P1.
- `src/domain/safety.ts` — add material-emergency patterns (or re-export from `social-emergency.ts`). Net-new, clinically reviewed code. `response` carries the 911 text.
- `src/ai/safety-gate.ts` — add a material-emergency `hard_escalate` branch in `decideSafety()`. **Placement for P0:** alongside the existing free-text `inputSafety` escalate (line 84), returning `hard_escalate`. Import and reuse `CARE_TEAM_ACTIONS` (already the constant returned on `hard_escalate`, line 120) — no new action. **Do not reference `crisis_escalate`.** (Re-tiering under crisis is P0-5b, after `task_e569880c`.)
- `src/ai/intent.ts` — `inferAiMode()` (lines 5-29) is called by `createSafeAiResponse` on the non-escalate path and returns `currentMode` unchanged when it is not `"explain"`, so a `mode: "connect"` request survives. No functional change required, but add `"connect"` awareness if narration routing needs it; keep this out of the escalation path entirely.
- `src/domain/tasks.ts` — social-task generation + **fix the `MAX_TODAY_TASKS = 3` truncation** (line 102): route non-urgent social follow-ups to `/social`, and inject only a **priority-1** urgent social task into `today` in a way the slice cannot drop it (see P0-11).
- `src/domain/health-brief.ts` — add the "Social needs & referrals" section. **Given section-level status only** (correction 4), represent per-need `EvidenceStatus` inside the item strings and/or split into status-homogeneous sub-sections; see §5.
- `src/domain/care-team-message.ts` — extend `buildCareTeamMessage(state)` to append flagged social needs (reads `state.socialFacts`, so **depends on P0-1 landing first**). The function today only reads `carePlan`/`readings`/`medications[0]` — the social append is a real addition, not "reuse."
- `src/state/store.tsx` — add reducer actions (see §5); each auto-audits via `recordAuditEvent()`.
- `src/state/storage.ts` — add `isSocialNeedFact`/`isSocialReferral` guards; extend `isTask()` (line 303) for `"social"`; extend `isAiMode()` (line 188) for `"connect"` (**required** — otherwise a persisted `connect`-mode `aiMessage` fails validation and the whole state is wiped, `storage.ts:502-504,518`); back-fill `socialFacts`/`socialReferrals` to `[]` mirroring the `mealLog`/`doseEvents` back-fill (lines 484-489); add both arrays to the sanitize path (`sanitizedState`, lines 495-500) and to `isValidAppState` (lines 456-470) so malformed entries are filtered, not fatal.
- `src/domain/labels.ts` — add `socialDomainLabel`, `referralStatusLabel`.
- `src/domain/fixtures.ts` — add Rosa (food-insecure hypertensive) so the brief + summary render in demo.

### Data flow (P0)
```
/social (en/es via sdohStrings)
  → patient answers (SocialDomain items, skippable, decline recorded)
  → dispatch recordScreenAnswer → SocialNeedFact[] (patient_reported)  [reducer, auto-audit]
  → on submit:
      computeSocialFlags(answers)                  [deterministic, domain/, NO model]
      + classifyMaterialEmergency(freeText)        [deterministic]
      → if emergency: createSafeAiResponse() returns hard_escalate
           (resource UI suppressed; content carries 911 text; CARE_TEAM_ACTIONS; buildCareTeamMessage drafted)
      → else: matchResources(flag) [seed ladder] → resource cards
  → "Connect me" → dispatch initiateReferral (consent + status "sent")  [audit "shared"]
  → dispatch flagSocialNeed → social TaskItem(s)
buildHealthBrief(state) → "Social needs & referrals" section + suggested Z-codes
```
Haiku is used only for narration polish (flag phrasing, resource-card summary) via the new `"connect"` `AiMode`, always downstream of deterministic flags. Safety classification, flagging, matching, and Z-code mapping never touch a model.

---

## 4. Work Breakdown (sequenced)

### Milestone P0 — Material-needs screen + seeded connect, offline-safe

- [ ] **P0-1 — Types & unions.** Add `SocialDomain`, `SocialNeedFact` (reuses `ExtractedFact` field shape + `domain`), `SocialScreen`, `ReferralStatus`, `ReferralConsent`, `SocialReferral`; extend `TaskItem.kind` with `"social"`; add `AiMode` `"connect"`; add `socialFacts`/`socialReferrals` to `AppState`. **Do not touch `AuditEvent.action`.**
  *Files:* `src/domain/types.ts`. *AC:* `tsc` compiles; existing files still compile (unions extended, not narrowed).

- [ ] **P0-1a — Generalize i18n parity (if F9 not yet done).** Extend `strings.test.ts:20-26` into a loop over all registered catalogs; add a catalog registry in `strings.ts`. **Coordinate — shared file.**
  *Files:* `src/i18n/strings.ts`, `src/i18n/strings.test.ts`. *AC:* parity test iterates ≥2 catalogs; a missing ES key fails `npm run check`.

- [ ] **P0-2 — SDOH string catalog (en/es).** Author `sdohStrings` for every screen item, consent/purpose copy, resource-card labels, dated public-charge reassurance, and the material-emergency escalation copy (**with explicit "call 911" text**). Register with the catalog registry.
  *Files:* create `src/i18n/sdoh-strings.ts`; modify `src/i18n/strings.ts`. *AC:* parity test green; every key present in `en` and `es`; the emergency string contains the literal 911 guidance in both locales.

- [ ] **P0-3 — Deterministic flag engine.** `computeSocialFlags(answers): SocialFlag[]` and `answerToSocialNeedFact(answer): SocialNeedFact` (`status: "patient_reported"`). Pure; no model; no I/O.
  *Files:* create `src/domain/social-screen.ts`. *AC:* Vitest: fixed answer set → exact flag set, deterministic, zero provider calls (FR-2/FR-3).

- [ ] **P0-4 — Material-emergency classifier.** `classifyMaterialEmergency(input): SafetyClassification` returning `{ level: "escalate", response }` where `response` (pulled from `sdohStrings`) includes the 911 text. Net-new, clinically reviewed.
  *Files:* create `src/domain/social-emergency.ts` (and/or patterns in `src/domain/safety.ts`). *AC:* Vitest: "no food today", "kids have nothing to eat", "out of insulin and have none" → `escalate`; benign phrasing → `allowed`; the escalate `response` contains 911 text.

- [ ] **P0-5 — Wire emergency into the gate (self-contained `hard_escalate`).** Add a material-emergency branch to `decideSafety()` returning `hard_escalate` with the classifier's message; import and reuse `CARE_TEAM_ACTIONS`. **Do NOT reference or depend on a `crisis_escalate` branch — it does not exist.** Ensure the `/social` surface suppresses resource UI whenever the response `safety === "escalate"`.
  *Files:* `src/ai/safety-gate.ts`. *AC:* **outcome ordering test** (`safety-gate.test.ts`): (a) material-emergency free-text → `HealthAiResponse.safety === "escalate"` and `content` contains 911 text; (b) material-emergency phrase **plus** a stored SBP-182 reading → still `escalate` (neither downgrades the escalation outcome); (c) a med-change phrase co-occurring with a material emergency → still `escalate` (soft-block does not win). **Assert on the returned response, never on internal branch identity** (FR-4).

- [ ] **P0-5b — Re-tier under crisis (deferred; after `task_e569880c` merges).** Once `task_e569880c` lands `crisis_escalate` + its crisis action, move the material-emergency branch to sit **below** crisis and **above** soft tiers per F4's documented order, and add the crisis-vs-material assertion (a suicidality disclosure must not be demoted by a co-occurring material emergency). **Not in the P0 critical path.**
  *Files:* `src/ai/safety-gate.ts`, `src/ai/safety-gate.test.ts`. *AC:* crisis disclosure + material emergency → crisis copy + crisis action wins; ordering test green.

- [ ] **P0-6 — Seeded resource directory + match ladder.** Seed ≥1 resource per `SocialDomain` (hours/distance/eligibility). `matchResources(flag, patient)` degrades seed → (live adapter stub, P1) → CHW-handoff sentinel.
  *Files:* create `src/domain/social-resources.ts`. *AC:* Vitest: each flag returns a seeded resource; empty-seed case returns the sentinel (FR-5, failure mode).

- [ ] **P0-7 — Deterministic Z-code map.** `suggestZCodes(flags): ZCodeSuggestion[]` mapping `SocialDomain → Z55–Z65`, each `status: "needs_review"` / "for physician confirmation." Rule-based only.
  *Files:* create `src/domain/social-zcodes.ts`. *AC:* Vitest: food flag → `Z59.4`-family suggestion, marked unconfirmed (FR-12).

- [ ] **P0-8 — Referral lifecycle + consent.** `createReferral(flag, resource, consent)` → status `sent`; `advanceReferralStatus()` structurally rejects `enrolled/received` without a `clinician` actor.
  *Files:* create `src/domain/social-referral.ts`. *AC:* Vitest: terminal-success transition returns error / throws without clinician actor; `sent`→`contacted`→`declined` allowed (FR-7).

- [ ] **P0-9 — Reducer actions + audit.** Add `startScreen`, `recordScreenAnswer`, `flagSocialNeed`, `initiateReferral`, `updateReferralStatus`; each auto-audits via `recordAuditEvent()`; `initiateReferral` records a `shared` event + the consent record. Use only existing action verbs.
  *Files:* `src/state/store.tsx`. *AC:* dispatching each action mutates state immutably and appends the correct audit event (FR-6, FR-13).

- [ ] **P0-10 — Persistence guards + migration.** Add `isSocialNeedFact`/`isSocialReferral`; extend `isTask()` (line 303) for `"social"`; extend `isAiMode()` (line 188) for `"connect"`; back-fill both arrays to `[]` (mirror 484-489); carry them through the sanitize path and `isValidAppState`.
  *Files:* `src/state/storage.ts`. *AC:* Vitest: legacy state (no social arrays, no `connect` messages) loads **without wipe**; a persisted `connect`-mode message validates (proving the `isAiMode` extension); malformed social entries are filtered, not fatal.

- [ ] **P0-11 — Task generation + FR-11 truncation fix.** Generate social `TaskItem`s. Route **non-urgent** social follow-ups to `/social`; inject a **priority-1** urgent social task into `today` such that the `slice(0, 3)` cannot drop it (e.g., include urgent social tasks before slicing, or bump the cap only when a priority-1 social task exists).
  *Files:* `src/domain/tasks.ts`. *AC:* Vitest: with 3 priority-1 clinical tasks **plus** 1 urgent social task, the urgent social task survives the slice; non-urgent social items do **not** appear in `today` (they live on `/social`) (FR-11).

- [ ] **P0-12 — Health Brief section.** Add "Social needs & referrals". **Resolve the per-item-status constraint:** since a `HealthBrief` section has one `status`, either (a) emit **one section per `EvidenceStatus`** present among the needs (e.g., a `patient_reported` sub-section and an `inferred` sub-section), or (b) encode each need's status in its item string and set the section status to the most-conservative present (`needs_review` > `inferred` > `patient_reported`). **Pick (a) or (b) — do not claim literal per-item status without one of them.**
  *Files:* `src/domain/health-brief.ts`. *AC:* Vitest: flagged fixture produces the section(s) with correct statuses and unconfirmed Z-codes; no auto-applied code (FR-12).

- [ ] **P0-13 — Care-team message extension.** Append flagged social needs to `buildCareTeamMessage(state)` (reads `state.socialFacts`; requires P0-1). 
  *Files:* `src/domain/care-team-message.ts`. *AC:* Vitest: flagged fixture yields a "Social need:" line; no-social fixture is unchanged.

- [ ] **P0-14 — Patient UI.** `/social`: consent/purpose first, `en`/`es`, skippable, decline recorded; deterministic summary tied to clinical reason; resource cards; "Connect me" consent → referral; emergency path suppresses resource UI and surfaces the escalation message (with 911 text) + care-team actions. **Confirm the component home first** (Open Questions).
  *Files:* create `src/app/social/page.tsx` + the three components. *AC:* Playwright: screen → flag → resource → consent → `sent`; emergency phrase → 911 escalation shown + no resource cards (FR-1/3/4/5/14).

- [ ] **P0-15 — Labels + fixtures.** `socialDomainLabel`, `referralStatusLabel`; Rosa food-insecure fixture.
  *Files:* `src/domain/labels.ts`, `src/domain/fixtures.ts`. *AC:* demo renders a flagged patient end-to-end.

- [ ] **P0-16 — Verification.** `npm run check` green; manual demo runbook.
  *AC:* lint + all Vitest + build pass; e2e green.

### Milestone P0.5 — Barrier bridge (deferred)
- [ ] **P05-1** — On `cost`/`ran_out`/`pharmacy_issue` in the adherence loop, offer the matching social resource linked to that specific medication (FR-8). *Files:* `src/domain/adherence.ts` consumer, `src/app/medicines/page.tsx`, `src/domain/social-resources.ts`.

### Milestone P1 — Food-is-Medicine + benefits pre-screen + loop closing (deferred; needs F1/F6/F8)
- [ ] **P1-0** — **P0-5b** (re-tier material emergency under `crisis_escalate` once `task_e569880c` merged) if not already shipped.
- [ ] **P1-1** — Produce-Rx workflow (care-team approval, `issueProduceRx`, redemption logging) — FR-9.
- [ ] **P1-2** — Food Lens procurement mode honoring `medDietRules` `suppressEncourage: "potassiumMg"` (`condition-lens.ts:114`); audit any `betterOptionGuidance` store-neutrality override — FR-10.
- [ ] **P1-3** — SNAP + LIHEAP pre-screen/initiation (pre-screen only).
- [ ] **P1-4** — CHW terminal-outcome confirmation + SLA re-surfacing (needs F8 + F3 actor) — FR-7, FR-11.
- [ ] **P1-5** — Sonnet physician brief + medical-necessity letter drafts.
- [ ] **P1-6** — `diabetesLens` build-out (F6) so Food-is-Medicine works beyond hypertension.
- [ ] **P1-7 (gated, FR-16)** — SI/mood/IPV items **only if** full F4 crisis pathway + F8 + clinical/legal sign-off + 42 CFR Part 2 segmentation all land. **Not this plan.**

### Milestone P2 — Interop (deferred; slowest)
- [ ] **P2-1** — FHIR write-back of Z-codes + referral `ServiceRequest`/`Task` (Gravity/US Core), physician-gated.

---

## 5. Data Model & Storage Changes

### New types (`src/domain/types.ts`)
```ts
export type SocialDomain = "food" | "housing" | "utilities" | "transportation" | "financial";

// Reuses the ExtractedFact field shape (label/value/confidence/status/sourceSnippet) per FR-2.
export type SocialNeedFact = {
  id: string;
  patientId: string;
  domain: SocialDomain;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  status: EvidenceStatus;          // "patient_reported" for direct answers; "inferred" for derived
  sourceSnippet: string;           // the screen item text or the reading/dose pattern it came from
  clinicalReason: string;          // ties each need to a reading trend / barrier / goal (spec: traceable)
};

export type ReferralStatus = "sent" | "contacted" | "enrolled" | "received" | "declined" | "lost";

export type ReferralConsent = {
  grantedAt: string;               // ISO
  scope: string;                   // plain-language description of what is shared
  minimizedFields: string[];       // data-minimization: exactly which fields would transmit (FR-6)
};

export type SocialReferral = {
  id: string;
  patientId: string;
  factId: string;                  // the SocialNeedFact this addresses
  resourceId: string;
  network: "seed" | "findhelp" | "unite_us";
  status: ReferralStatus;
  consent: ReferralConsent;
  statusTimeline: Array<{ status: ReferralStatus; at: string; actorKind: "patient" | "clinician" | "system" }>;
};
```
- **`TaskItem.kind`** extends to `"reading" | "medicine" | "visit" | "intake" | "privacy" | "social"` (real union change; `isTask()` guard at `storage.ts:303` **must** add `"social"` or valid tasks are dropped by `sanitizeTasks`).
- **`AiMode`** extends with `"connect"` (`types.ts:100`); `isAiMode()` at `storage.ts:188` **must** add it or persisted `connect` messages wipe state.
- **`AppState`** gains `socialFacts: SocialNeedFact[]` and `socialReferrals: SocialReferral[]`.
- **`AuditEvent.action`** — **unchanged in P0.** The current union is closed (`types.ts:130`) and `isAuditEvent` hard-codes it (`storage.ts:352-357`). Referral events use the existing `shared`/`created`/`updated` verbs. Closed-loop verbs (`referral_opened`/`referral_closed`) + the actor land with **F3** in P1; do not fork the union early.

### HealthBrief per-item status (resolves FR-12 vs the type)
`HealthBrief.sections[n]` has a single `status: EvidenceStatus` (`types.ts:120-124`). To honor "per-item `EvidenceStatus`" without changing the shared type, P0-12 emits the social block as **one section per distinct status** present among the needs (e.g., "Social needs (patient-reported)", "Social needs (inferred)"), plus a "Suggested Z-codes (for physician confirmation)" section at `status: "needs_review"`. If product prefers a single section, encode each need's status inline in the item string and set the section status to the most conservative present. **This choice is a P0-12 decision, not left implicit.**

### New reducer actions (`src/state/store.tsx`, `HealthAction`)
- `{ type: "startScreen" }` → creates/refreshes the social screen; audit `created`.
- `{ type: "recordScreenAnswer"; fact: SocialNeedFact }` → appends to `socialFacts`; audit `updated`.
- `{ type: "flagSocialNeed"; fact: SocialNeedFact }` → marks flagged; drives a social `TaskItem`; audit `updated`.
- `{ type: "initiateReferral"; referral: SocialReferral }` → appends to `socialReferrals`; audit **`shared`** "Referral sent to <network>" + consent record (FR-6).
- `{ type: "updateReferralStatus"; referralId; status; actorKind }` → advances via `advanceReferralStatus()` guard; audit `updated`.
- (P1) `{ type: "issueProduceRx"; ... }`.

### Serialization / migration (`src/state/storage.ts`)
- Add `isSocialNeedFact`, `isSocialReferral`; extend `isTask()` (303) for `"social"`; extend `isAiMode()` (188) for `"connect"`.
- In `loadStoredState()`, mirror the back-fill at 484-489: if `parsed.socialFacts === undefined` set `[]`; same for `socialReferrals`. Existing localStorage migrates **without a wipe**.
- Add both arrays to the `sanitizedState` construction (495-500) and to `isValidAppState` (456-470) so malformed social entries are filtered rather than triggering `safeRemoveItem` + `demoState` fallback (502-504).

---

## 6. AI / Model Wiring

- **Deterministic (NEVER LLM), in `domain/`:** `classifyMaterialEmergency`, `computeSocialFlags`, `matchResources`, `suggestZCodes`, referral lifecycle. Models never decide escalation, flagging, matching, or coding — the F5 non-device posture and the spec's hard rule.
- **Haiku (via new `"connect"` `AiMode`):** localize/adapt screen phrasing, first-pass flag narration, resource-card summarization, routine CHW-nudge drafts. Always downstream of the deterministic flags; never the source of truth for a flag or code.
- **Sonnet (streamed):** P1 physician-facing brief synthesis, medical-necessity letters, condition-anchored "why." Not in P0.
- **Gate behavior (verified against `safety-gate.ts`):** on a material emergency, `decideSafety()` returns `hard_escalate` → the provider is **never called** (line 115-122), the escalation message (**carrying the 911 text**) is the whole answer, `actions = CARE_TEAM_ACTIONS`, resource UI is suppressed, and `buildCareTeamMessage` drafts the human summary. Note the hard-escalate return has **no `banner`** — 911 text must be in `content`. Mock provider path works with zero API key.
- **`"connect"` is a real type change:** add to `AiMode` (`types.ts:100`) **and** `isAiMode()` (`storage.ts:188`). `inferAiMode` (`intent.ts:5-6`) returns a non-`explain` mode unchanged, so `"connect"` survives the gate's `inferAiMode` call (`safety-gate.ts:126`); verify no narration request accidentally down-maps it.

---

## 7. Testing Strategy

**Vitest unit (deterministic-first):**
- `social-screen.test.ts` — fixed answers → exact flags; answer → `SocialNeedFact` (`status: "patient_reported"`); zero provider calls (FR-2/3).
- `social-emergency.test.ts` (or extend `safety.test.ts`) — material-emergency patterns → `escalate` with 911 text in `response`; benign phrasing → `allowed`.
- **`safety-gate.test.ts` (extend) — the safety-regression test that must stay green.** Outcome-level assertions only: (a) material emergency → `response.safety === "escalate"` and `content` contains 911; (b) material emergency + stored SBP 182 → still `escalate`; (c) material emergency + med-change phrase → still `escalate`, not `blocked`. **No assertion references a `crisis_escalate` branch** (it does not exist until `task_e569880c`).
- `social-resources.test.ts` — each flag → seeded resource; empty seed → CHW-handoff sentinel.
- `social-zcodes.test.ts` — domain → Z-code family, all `needs_review`/unconfirmed.
- `social-referral.test.ts` — terminal `enrolled/received` rejected without clinician actor (FR-7).
- `tasks.test.ts` (extend) — urgent social task survives `slice(0, MAX_TODAY_TASKS)` even against 3 priority-1 clinical tasks; non-urgent social items excluded from `today` (FR-11).
- `health-brief.test.ts` (extend) — social section(s) render with correct `EvidenceStatus` representation (per the P0-12 choice) + unconfirmed Z-codes.
- `storage.test.ts` (extend) — legacy state migrates (arrays back-filled `[]`, no wipe); a `connect`-mode message validates; malformed social entries sanitized.
- `strings.test.ts` (extend/generalize) — `sdohStrings` en/es parity (F9); emergency string contains 911 in both locales.

**Playwright e2e:**
- `social-screen.spec.ts` — complete screen (en) → flag → resource → consent → `sent`; `/privacy` shows the `shared` audit event.
- `social-emergency.spec.ts` — material-emergency phrase → 911 escalation shown, **no resource cards**, care-team actions present.
- `social-es.spec.ts` — screen in `es` renders all items translated.
- `social-skip.spec.ts` — decline an item → decline recorded, rest submits (FR-14).

**Must stay green (existing regressions):** `safety.test.ts`, `safety-dose-change.test.ts`, and the current gate tiers (dangerous vitals hard-escalate; med-change soft-block). The new branch must not perturb them.

---

## 8. Rollout, Flags & Verification

- **No flag framework.** P0 rides `HEALTH_AI_PROVIDER=mock` (default) — everything demoable with zero API keys because flags/matches/codes are deterministic. `HEALTH_AI_PROVIDER=openai` only adds Haiku narration polish; it never changes a flag, code, or escalation.
- **Network posture:** P0 ships `network: "seed"` referrals only. The live findhelp/Unite Us adapter is env-gated (`SDOH_REFERRAL_NETWORK` unset → seed) and **must not be enabled until F1 + BAA + data-minimization review land**. P0's queue marks referrals "not yet sent" if a live network is configured but unreachable (failure mode).
- **Demo/verify P0 on the prototype:** `npm run dev` → `/today` (urgent social task present, not truncated) → `/social` (screen in en; switch `PatientProfile.language` to `es` and re-check) → answer to trigger a food flag → see resource card → "Connect me" → confirm `sent` on the `/visits` brief and a `shared` event on `/privacy`. Then enter "no food today" → confirm the 911 escalation content and suppressed resource UI.
- **Gate before real PHI:** F1 backend + BAA (hosting + LLM provider) + counsel sign-off on the consent UX and public-charge copy (F5) + a named CHW owner per clinic. None needed for the local P0 demo; all hard-blocking before a live referral leaves the device.

---

## 9. Risks, Open Questions & Decisions Needed

- **Escalation tiering vs `task_e569880c` (sequencing):** P0 ships the material emergency as a self-contained `hard_escalate` (safe today). **The draft's "insert below `crisis_escalate`" was un-actionable — that branch does not exist.** Decide whether to ship P0 now and re-tier in P0-5b after the crisis session merges, or hold P0-5 until then. *Recommend ship-now + re-tier; a material emergency as `hard_escalate` is already the correct outcome. Owner: eng.*
- **HealthBrief per-item status (design):** section-level status forces a choice — one section per status, or inline-encoded status. *Recommend one section per status. Owner: product + eng (P0-12).*
- **FR-11 truncation strategy (design):** route non-urgent social items to `/social` and force only priority-1 urgent social tasks into `today`. *Recommend the split. Owner: product.*
- **Component home (executability):** there is no `src/components/` dir today; existing UI lives under `src/app/*`. Decide colocation vs a new components dir before P0-14. *Owner: eng.*
- **Z-code mapping fidelity (clinical/regulatory):** the deterministic `SocialDomain → Z55–Z65` map needs clinical review for the right sub-codes; must stay suggestion-only (F5). *Owner: clinical + counsel.*
- **Public-charge accuracy (regulatory, time-sensitive):** copy must be dated and sourced; hang F5 `SourceCitation`; set a review cadence. *Owner: counsel.*
- **Consent UX + data minimization (regulatory):** `minimizedFields` must be reviewed before any live network sends real fields (FR-6). *Owner: counsel.*
- **CHW as hard dependency (operational):** loop closure (P1) is impossible without a named human owner. *Owner: product.*
- **Behavioral-screen temptation (standing no):** do not ship mood/SI/IPV before full F4 + F8 + legal + 42 CFR Part 2. *Standing decision: no.*

---

## 10. Effort & Sequencing Estimate

| Milestone | Size | Notes |
|---|---|---|
| **P0 types + storage + reducer** (P0-1, P0-9, P0-10) | **M** | Union + arrays + guards (`isTask`/`isAiMode`) + migration; mechanical but touches shared shapes — coordinate. |
| **P0 deterministic domain** (P0-3, P0-4, P0-6, P0-7, P0-8) | **M** | Pure functions + tests; the intellectual core, self-contained. |
| **P0 safety-gate branch** (P0-5) | **S** | Small; self-contained `hard_escalate`, no crisis dependency. The re-tier (P0-5b) is deferred. Highest-care small task. |
| **P0 i18n + catalog** (P0-1a, P0-2) | **S–M** | Straightforward once F9 generalization exists; ES copy needs a translation pass. |
| **P0 brief/tasks/message wiring** (P0-11, P0-12, P0-13, P0-15) | **S–M** | P0-12 carries the per-item-status decision. |
| **P0 UI** (P0-14) | **M–L** | New page + 3 components + consent + emergency-suppression + e2e. Largest single piece. |
| **P0.5 barrier bridge** | **S** | Isolated; out of P0 to keep the slice thin. |
| **P1 (procurement/benefits/loop-close/brief)** | **L** | Needs F1 + F6 + F8 + partner integrations. |
| **P1 SI/mood/IPV (FR-16)** | **XL, gated** | Do not start until full F4 + F8 + legal + Part 2 land. |
| **P2 FHIR interop** | **XL** | Per-EHR; slowest dependency. |

**Suggested build order:** P0-1 → P0-1a → P0-2 → P0-3/P0-4/P0-6/P0-7/P0-8 (deterministic domain, TDD) → P0-5 (self-contained gate branch) → P0-9/P0-10 (reducer + storage) → P0-11/P0-12/P0-13/P0-15 (wiring + fixtures) → P0-14 (UI) → P0-16 (verify). Ship P0. Then P0.5, then P0-5b when `task_e569880c` merges, then P1 once F1/F6/F8 land.
