# Best-of-Both Integration Sprint — Patient Centered × rhtp-prototype

**Paste-ready end-to-end handoff. Execute P0→P8 in order, no per-phase stops. All work lands in `C:\Patient centered` (Next.js 15 / React 19 / Tailwind 3 / vitest / Playwright, Windows, npm). Solo repo, direct commits to `master`, NO push (no remote), no PRs.**

## Context

`C:\Patient centered` is the base app going forward: a patient-owned home-health prototype (hypertension focus; localStorage state via `useReducer` + validated storage; deterministic safety gate in front of a mock-first AI provider). `C:\Patient centered\rhtp-prototype` is an older sibling prototype (Vite/React 18, **nested unrelated git repo, untracked**) containing finished, tested, dependency-free implementations of capabilities the base app's own roadmap (`docs/plans/`, `docs/specs/`) marks planned-but-unbuilt or blocked:

- **Crisis red-flag detection** — base app has NO crisis pathway; plan 04 hard-blocks its P0-CRISIS milestone on this ("F4 gate" / task_e569880c). **This sprint builds F4**; the exported symbols become the contract other plans bind to.
- **Answer-grounding verifier** — the system prompt asks for evidence labels; nothing enforces them on model output.
- **Voice safety** — live voice bypasses the safety gate (spec 07 FR-6a, "the non-negotiable one"); verified: the MOCK voice path bypasses it too (`src/ai/mock-provider.ts:145` calls `respond` directly).
- **PDC adherence** (NCQA-style proportion-of-days-covered) — base app only has streaks/rates.
- **SDOH resource catalog + finder** — plan 03's unbuilt resource connection.
- **Accessibility rendering profiles** — plan 07 FR-10 direction.
- **Ops gate discipline** — dated red-team-result markdown.

## Scope decisions (user-confirmed 2026-07-06)

1. **Full integration** — safety spine + PDC + SDOH finder + accessibility profiles + ops gates.
2. **Minimal PHQ-9** — standard questionnaire + item-9 crisis routing + AssessmentEvent storage + consent gate. Trends/GAD-7/behavioral lenses deferred.
3. **PhoneFrame only** — 390 px demo bezel route; no staff hub.
4. Base app design system retained (ink/paper/care/pulse/calm/note tokens, `rounded-control`, min-h-12 targets); rhtp visual style NOT imported.

## Non-goals (do not build)

- **`docs/adherence-trust-uplift-spec.md` (workstreams A–G)** — separate pending work, none implemented yet. Do not implement it; do not collide: (a) do NOT redesign the nav (uplift F owns that; new tabs append at the END of the current list); (b) crisis-tier copy added here supersedes uplift D's plain-safety-copy for the crisis tier only — say so in the P0 commit body. `src/domain/adherence.ts` (streak/rate) stays byte-identical — uplift B owns its evolution.
- rhtp `site-matching.ts`, `screening-gap.ts` (plan 01, still blocked on F2/F5), `identity-corroboration`, `equity-metrics`, protocol packs, hub views, zustand store, ai-script chips, and all server gates except the concepts P2 names.
- Any backend, SMS, EHR/FHIR, multi-patient surface, push notifications, languages beyond en/es.

## Hard guardrails (every phase)

- **File copies only between trees.** `rhtp-prototype/` has its own `.git`, unrelated history. Never `git add rhtp-prototype`, never run git inside it, never import from it (`grep` guard in P8). It stays untracked, unmodified.
- **No `git push`** — repo has no remote by choice. **Path-scoped commits**: `git add <specific paths>`, never `git add .`/`-A`. Conventional messages as given.
- **Mock-first invariant:** `npm run check` passes with zero env vars. Nothing new requires `HEALTH_AI_API_KEY` at build/test time.
- **Atomic type+guard rule (data-loss tripwire):** any change to `AiMessage.safety` values, `AuditEvent.action` union, or `AppState` shape MUST land in the same commit as the matching `src/state/storage.ts` guard/sanitizer/migration-shim edits and a pre-feature-payload regression test. `loadStoredState` hard-rejects unknown shapes and silently resets to `demoState` — that is the failure mode being prevented.
- Ported modules keep their vitest suites (adapted to base-app vitest 2.x idioms), ported in the same phase.
- All new patient-facing strings go through `Record<Language, Record<Key, string>>` catalogs + `t()`-style helpers (`src/i18n/strings.ts` pattern), en + es, equal urgency in es.
- Reuse first: `classifySafety`, `createSafeAiResponse`, `findRecentClinicalReading`, `buildTodayTasks`, `recordAuditEvent` pattern, `buildCareTeamMessage`, card/button idioms from `dose-card.tsx`. TypeScript strict, no `any`, no comments on unchanged code.

## Cross-cutting contract (established in P0, everything compiles against it)

In `src/domain/types.ts` (NOT src/ai/types.ts — `AiMessageAction` lives at `src/domain/types.ts:102`):

```ts
export type AiMessageAction =
  | "call_clinic" | "draft_message"
  | "crisis_call_988" | "crisis_text_988" | "call_emergency" | "safety_plan";
export type SafetyLevel = "allowed" | "escalate" | "blocked" | "crisis";  // AiMessage.safety widens to this
// AuditEvent.action: + "crisis_escalated"  (P0)  + "assessment_recorded" (P4)
// AppState: + medicationFills (P3), + assessmentEvents (P4); PatientProfile: + county? (P5), + accessibilityPreferences (P6)
```

`src/ai/types.ts`: `HealthAiResponse.safety` widens to `SafetyLevel`; `+ grounding?: { allowed: boolean; blockedReasons: string[] }` (P1); new `LiveSessionEvent` variant `safetyIntercept` (P2).

`src/state/storage.ts` in the SAME commit as each union/shape change: `isAiMessage` accepts `"crisis"`; `isAuditEvent` accepts new actions; add lenient `sanitizeAiMessageActions` (filter unknown strings — actions are unvalidated today; do not introduce a new rejection vector); missing-array shims in `loadStoredState` (`parsed.medicationFills ??= []` etc., mirroring the existing pattern at storage.ts:484-489). Known accepted limitation (document in commit body): rolling back to an older build AFTER crisis data persisted wipes to demoState.

`src/i18n/strings.ts`: new `safetyStrings` catalog + `tSafety(language, key)` — keys: `crisisResponse` (fixed human-authored constant), `crisisCall988`, `crisisText988`, `callEmergency`, `safetyPlanLabel`, `safetyPlanBody`, `crisisAcknowledge`, `emergencyResponseSuffix`, `groundingFallback`, `groundingFallbackBanner`, `voiceInterceptNotice`. Extend the strings parity test to iterate all catalogs.

## Port map

| rhtp-prototype source | Destination | Adaptation |
|---|---|---|
| `src/lib/crisis-red-flags.ts` + `.corpus.ts` + test | `src/domain/crisis-red-flags.ts` + corpus + test | API verbatim (`screenCrisisRedFlags`, `measureCrisisRecall`, `CRISIS_RECALL_FLOOR=0.95`); ADD negation handling + new rules/cases (P0 — rhtp has none) |
| `src/lib/grounding.ts` + test | `src/domain/grounding.ts` + test, adapter `src/ai/grounding-facts.ts` | Keep 6 live rule codes (+ dormant `unsupported_claim`, documented); swap retinopathy claim extractors → BP/A1c/threshold/med extractors (P1) |
| `server/realtime-voice.ts` | concepts → `src/app/api/realtime/token/route.ts` + `src/ai/voice-safety-identifier.ts` | Preconditions + attestation 409 + `OpenAI-Safety-Identifier` sha256 header (`node:crypto` fine — Node runtime route) (P2) |
| `src/lib/realtime-voice-metrics.ts` + test | `src/ai/realtime-voice-metrics.ts` + test | Verbatim (pure, zero deps) |
| `server/pdc-adherence.ts` + test | `src/domain/pdc-adherence.ts` + test | **Unchanged** (verified pure — no node:crypto, that was realtime-voice.ts); new adapter `src/domain/medication-fills.ts` (P3) |
| `src/lib/kentucky-sdoh-resources.ts` + test | `src/domain/sdoh-resources.ts` + test | Catalog + county-first search verbatim; types inlined (P5) |
| `src/lib/accessibility-policy.ts` + test | `src/domain/accessibility.ts` + test | Port profile builder + summary; DROP `educationMeetsAccessibilityFloor` (rhtp protocol-packs dep) (P6) |
| `src/components/phone/PhoneFrame.tsx` | `src/components/phone-frame.tsx` + `src/app/demo/page.tsx` | Rebuild ~30 lines with base tokens; iframe `/today` (P7) |
| `docs/ops/red-team-results/*` format | `docs/ops/red-team-results/` | Adopt sections: Date / Command / Result / Output / Interpretation (P8) |

---

## P0 — Crisis pathway (builds F4; spec 04 FR-4…FR-8)

1. **Port classifier** → `src/domain/crisis-red-flags.ts` (+corpus file). Keep rhtp's 10 rules + corpus; keep the dormant `model_backstop`/`requiresRuleGapTicket` hook. ADD rules: `self_harm_dont_want_to_be_here` (`/(?:do\s+not|don'?t)\s+want\s+to\s+be\s+here\b/i`), `self_harm_want_to_die` (`/\bwant\s+to\s+die\b|\bend(?:ing)?\s+it\s+all\b/i`), `self_harm_overdose_disclosure` (whole-bottle/took-all + on-purpose variants incl. lisinopril/metformin/amlodipine), `acute_worst_headache` (`/worst\s+headache\s+of\s+my\s+life|thunderclap/i` → acute_danger). ADD negation handling (new work — rhtp has none): `NEGATION_PATTERNS` (`would/will/could never hurt|harm|kill myself`, `not going to hurt/kill myself`, `no thoughts of hurting/killing myself`) implemented as **strip-negated-spans-then-rescan**, so "I said I'd never hurt myself but I want to die" still fires. KEEP all four `vision` rules (sudden vision loss/curtain IS a hypertensive-emergency presentation) — tier-mapped, not deleted: `self_harm` → crisis tier; `vision` + `acute_danger` → emergency tier.
2. **Corpus** grows to ~20: keep rhtp's 10; add positives "I don't want to be here anymore", "I want to die", "I took the whole bottle of my lisinopril on purpose", "worst headache of my life and my BP is 210 over 120"; add negatives "I would never hurt myself", "I'm not going to hurt myself, I just feel down", "this diet is killing me", "the pharmacy is killing me with these prices", "I need a ride to my eye appointment", "my blood pressure was 150 over 95 after climbing the stairs". Recall floor ≥ 0.95 AND `falsePositives.length === 0` asserted.
3. **`src/domain/safety.ts`**: export `classifyCrisis(input): CrisisScreeningResult` (thin wrapper — THE public F4 symbol). `classifySafety` stays 3-level (reading-note consumers depend on its semantics).
4. **`src/ai/safety-gate.ts`**: export `CRISIS_ACTIONS = ["crisis_call_988","crisis_text_988","call_emergency","safety_plan"]` and `EMERGENCY_ACTIONS = ["call_emergency","call_clinic","draft_message"]` (`CARE_TEAM_ACTIONS` unchanged). `SafetyDecision`: add `{ kind: "crisis_escalate" }`; `hard_escalate` gains `tier: "emergency" | "care_team"`. `decideSafety`: **literal first statement** runs `classifyCrisis(request.patientInput)`; self_harm match → `crisis_escalate`; any other crisis match (vision/acute_danger) → emergency-tier hard_escalate — both BEFORE the `recentClinicalReading` block at safety-gate.ts:48 (this also fixes today's real burial of "my face is drooping" under a stored threshold reading). Existing note/numeric/input hard-escalates → `tier:"emergency"`; side-effect escalate → `tier:"care_team"`. `createSafeAiResponse`: crisis short-circuit above hard_escalate — provider NEVER constructed/called; returns `{ content: tSafety(state.patient.language, "crisisResponse"), safety: "crisis", sources: [], actions: CRISIS_ACTIONS }`. Hard-escalates map tier → `EMERGENCY_ACTIONS`/`CARE_TEAM_ACTIONS`.
5. **`src/state/store.tsx`**: in `addAiMessage`, an assistant message with `safety === "crisis"` audits as `"crisis_escalated"` ("Crisis resources shown") instead of generic `ai_generated` — a crisis message cannot persist without its audit record. Add `{ type: "acknowledgeCrisis"; messageId: string }` (audits `"updated"`, "Crisis resources acknowledged").
6. **`src/components/conversation-panel.tsx`** (+ pass `language` from chat page): crisis actions render as `tel:988`, `sms:988`, `tel:911` deep links (offline-safe; MUST NOT depend on `clinic.phone`) + `safety_plan` as inline expandable localized block; add `crisis` entries to the three `Record<AiMessage["safety"], …>` style maps (compiler enforces once the union widens); composer disabled while latest assistant message is an unacknowledged crisis message, acknowledge button dispatches `acknowledgeCrisis` (FR-8).
7. **Storage + i18n**: per cross-cutting contract, same commit.

**Tests** — crisis-red-flags: self-harm/acute/vision detection, overdose disclosures, negation traps NOT flagged, figurative/logistics NOT flagged, recall floor + zero false positives on corpus. safety-gate (extend existing file): ordering (170/104 stored reading + "I want to die" → `"crisis"`); provider bypass (`vi.fn` respond 0 calls, content === EN constant); Spanish constant; no-burial ("I don't want to be here, also what is my BP?" → crisis only); negated phrasing not escalated; dangerous vitals/urgent symptoms get `call_emergency`; side-effect stays care-team; ALL existing cases green unchanged. store: crisis audit on message add; acknowledge audits. storage: accepts crisis message + audit values; filters unknown action strings; loads pre-crisis persisted state without loss. conversation-panel: 988/911 links render; render without clinic phone; composer lock until acknowledged. strings: parity across catalogs.

**Commit:** `feat: crisis pathway with 988/911 actions (F4 gate; spec 04 FR-4..8)`

## P1 — Grounding verifier on model output

1. **Port** → `src/domain/grounding.ts` with local trimmed `SourceFact` (`{ id, label, value, sourceKind: "care_plan"|"medication"|"reading"|"extracted_fact"|"context_item"|"goal", sourceName, confidence, patientConfirmed, effectiveDate }`). Keep rule codes `missing_citation`, `unknown_citation`, `diagnosis_claim`, `medication_change`, `unsupported_result_claim`, `numeric_mismatch` (+ dormant `unsupported_claim`, documented never-emitted). Extractor swaps: keep `a1c` quantitative claims (Brent's fact = "8.0%"); replace `months_since_screening` with `blood_pressure` (`/\b(?:blood\s+pressure|bp|reading)\s*(?:is|was|of|at)?\s*(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/gi` — both numbers must match a cited reading fact "S/D"); clinical-adjacent set → a1c/blood-pressure/readings/call-threshold/med-names; diagnosis claims generalized (hypertension/high blood pressure/diabetes/kidney disease); medication-change patterns keep rhtp's conservative shapes with local drug names — **do NOT add a `the dose` variant** (verified: mock why-mode embeds safetyNote "Do not stop or change the dose…", which must keep passing — lock with regression test); normal-result patterns target readings/BP; drop retinal-gap + site-availability checks; keep diabetes-claim check with support pattern widened to `/diabetes|blood\s+sugar|a1c|metformin/i` (Brent's facts never say "diabetes").
2. **`src/ai/grounding-facts.ts`**: `collectSourceFacts(state: AppState): SourceFact[]` — **fact ids MUST equal existing app source ids** (same id set as `getKnownSourceIds`, storage.ts:60) so `providerResponse.sources` doubles as `citationIds`: care plan (id = carePlan.id; value = summary + "160/100" thresholds + condition), each goal, each medication (name/dose/schedule/purpose), each reading ("S/D", measuredAt as effectiveDate), each context item (title/rawText — grounds "type 2 diabetes" for Brent), each extracted fact (`patientConfirmed = status === "confirmed"`).
3. **Wire into `createSafeAiResponse`**: after `provider.respond`, before EVERY return carrying `providerResponse.content` (allowed AND soft paths): `verifyGrounding({ answer, sourceFacts: collectSourceFacts(request.state), citationIds: providerResponse.sources })`. On block → `{ content: tSafety(lang,"groundingFallback"), safety: "blocked", banner: tSafety(lang,"groundingFallbackBanner"), actions: CARE_TEAM_ACTIONS, sources: [], grounding }` (wrong block degrades to "contact your team", never silence). On pass → attach `grounding` field unchanged. Crisis/hard paths never reach it.
4. **`src/ai/mock-provider.ts`**: content unchanged; fix food-mode `sources` — when the trend sentence ("readings trending up") is appended, include the latest reading id in `sources`.
5. **`src/app/chat/page.tsx`**: when `response.grounding?.allowed === false`, `recordAuditEvent(patientId, "ai_generated", "AI answer replaced by grounding fallback")`.

**Tests** — grounding: block unsupported A1c; allow cited A1c 8.0; block BP numbers not matching cited readings; block diagnosis claims; block med-change instructions; **do not block "do not stop or change the dose" safety notes**; block clinical-adjacent claims with zero facts; unknown citation ids. grounding-facts: ids match known source ids (brentState); confirmed facts marked patientConfirmed. safety-gate: ungrounded answer → localized fallback + care-team actions; **mode × fixture matrix: every mock canned answer for demoState AND brentState passes grounding unchanged**; grounding applies to soft-block answers too.

**Commit:** `feat: grounding verifier enforces evidence-labeled answers (blocks ungrounded claims)`

## P2 — Voice safety: FR-6a interception + mint hardening + metrics

1. **`src/ai/realtime-session.ts`**: flip `turn_detection` to `{ type: "server_vad", create_response: false, interrupt_response: true }`; export the payload as `REALTIME_SESSION_CONFIG` (test pins `create_response === false` — the load-bearing edit; with auto-response on, classify-before-respond is impossible).
2. **New `src/ai/voice-gate.ts`** (pure, sync): `evaluateVoiceTranscript(transcript, state, language): VoiceGateDecision` = `{ kind:"pass" } | { kind:"intercept"; safety:"crisis"|"escalate"|"blocked"; content; banner?; actions }` — runs `classifyCrisis` (self_harm → crisis + CRISIS_ACTIONS + fixed constant; vision/acute → escalate + EMERGENCY_ACTIONS) then `classifySafety` (escalate → emergency intercept; blocked → soft intercept + CARE_TEAM_ACTIONS).
3. **Spoken-BP normalization in `src/domain/safety.ts`** (fixes voice AND the today-broken typed "200 over 130"): `normalizeSpokenReading(input)` — number-words → digits for BP shapes, `N over M` → `N/M`; called at the top of the dangerous-reading check.
4. **Turn control** in `realtime-session.ts`: on final `userTranscript`, run `args.gateTranscript(text)` (new required `ConnectArgs` field): pass → `send({type:"response.create"})`; intercept → NO create, `send({type:"response.cancel"})` + `send({type:"output_audio_buffer.clear"})`, emit new `LiveSessionEvent` `{ type:"safetyIntercept", … }`. **Fail-closed timer**: `speech_stopped` with no `transcription.completed` within ~4 s → never `response.create` for that turn, emit non-fatal "didn't catch that". Extract testable helper `applyTranscriptGate(decision, send, onEvent)`.
5. **`src/ai/mock-provider.ts`** `openLiveSession().sendUserText`: route through `createSafeAiResponse(…, this)` instead of direct `respond` (closes the verified mock bypass; mock voice gains crisis gate AND grounding); non-allowed results emit `safetyIntercept`.
6. **Metrics**: port recorder verbatim → `src/ai/realtime-voice-metrics.ts`; `recorder.observeServerEvent(raw)` first thing in `channel.onmessage`; expose `getMetricsReport()` on the session handle (report-only).
7. **Hook + UI**: `src/hooks/use-food-voice-session.ts` builds `gateTranscript` from app state + passes `onSafetyIntercept`; refuses to `start()` when `hasUnacknowledgedCrisis(state)` (new selector). The live-voice surface is the Food page: intercepts append an assistant `AiMessage` (crisis audit flows through the P0 store seam automatically). Extract the action-button block from `ConversationPanel` into shared `src/components/message-actions.tsx`; `FoodConversation` renders banner + actions for non-allowed messages.
8. **Token route** `src/app/api/realtime/token/route.ts`: accept optional body `{ patientId?, crisisOpen? }` → `409 { mode:"blocked", reason:"open_red_flag" }` when `crisisOpen === true` (attestation gate — server can't see localStorage; documented as such); port `buildVoiceSafetyIdentifier` → `src/ai/voice-safety-identifier.ts` (sha256, `node:crypto` — Node runtime route) sent as `OpenAI-Safety-Identifier` on the mint request.

**Tests** — voice-gate: self-harm intercept (crisis actions + constant); spoken "one eighty over one twenty" intercepted; "200 over 130" intercepted; spoken med-change soft-blocked; routine food question passes; negated self-harm passes. safety: word-form readings dangerous; implausible pairs still ignored. realtime-session: config pins `create_response:false`; `applyTranscriptGate` creates response on pass / cancels + emits on crisis / fail-closed timer never creates without transcript. mock-provider: live text turns run the gate; crisis utterance → `safetyIntercept`, no assistant answer. metrics: two ported tests (fake `nowMs`). token route: blocked on crisis attestation; safety-identifier header on mint (mock fetch, stub env).

**Commit:** `feat: voice turns run the safety gate before any spoken answer (FR-6a)`

## P3 — PDC adherence beside existing streaks

**Decision (justified): new `MedicationFill` slice feeding `calculateDiabetesPdc` as-is. Deriving PDC from DoseEvents is REJECTED** — PDC is a claims measure (IPSD, days-supply carry-forward, ≥2 fill dates, ≥91-day window, insulin exclusion); a DoseEvent-derived number is a fabricated quality metric wearing a regulated measure's name. Dose-mark honesty already lives in `getAdherenceRate`/`getAdherenceStreak` (untouched).

1. Port `server/pdc-adherence.ts` → `src/domain/pdc-adherence.ts` **unchanged** + its 6 tests verbatim.
2. `MedicationFill = { id, patientId, medicationId, medicationName, dateOfService, daysSupply, source: EvidenceStatus }`; `AppState.medicationFills`. Fixtures: demo/deleted states get `[]`; **brentState** gets 4 metformin fills (2026-01-05, 02-20, 04-10, 06-01, each 30 days → PDC-to-date ≈ 66% < 80 → refill-gap fires, telling Brent's cost-barrier story).
3. **Demo reachability** (verified gap: `brentState` is exported but unreachable — no fixture switcher): extend `resetDemo` to `{ type: "resetDemo"; patient?: "jordan" | "brent" }` (default jordan) + a "Load Brent demo (blood pressure + diabetes)" button in the privacy panel's demo controls. This also serves P5 (county) and P4 demos.
4. New `src/domain/medication-fills.ts`: `toPharmacyFillClaims(fills)`; `getPdcToDate(state, today): DiabetesPdcResult | null` — null when nothing classifies via `classifyDiabetesMedication` (card-visibility predicate); else `calculateDiabetesPdc({ …, disenrollmentDate: toDateKey(today) })` — the module-sanctioned honest to-date denominator (document); `buildRefillGapDraft(state, result)` — wraps `buildRefillGapInsight`, composes a care-team paragraph via `buildCareTeamMessage` + PDC line → maps `navigator_refill_barrier_review` onto the existing `draft_message` affordance (no new action value).
5. Storage: `isMedicationFill` + `sanitizeMedicationFills(fills, patientId, medicationIds)` (mirror `sanitizeDoseEvents`, storage.ts:418-427) + **`parsed.medicationFills ??= []` shim** (without it every existing user resets to demoState). Store: `{ type: "logMedicationFill"; fill }` → audit `"created"` "Medication refill logged".
6. `src/components/pdc-card.tsx` on the medicines page, three states: **hidden** (null — Jordan); **"not enough refill history yet"** when `eligible === false` for a patient with a diabetes-classifiable med (never a percent; insulin exclusion → "ask your care team" copy); **percent + threshold** when eligible, refill-gap draft button when insight non-null. Small "log a refill" form (date + days supply; med select limited to diabetes-classifiable meds). Card copy: **"estimate from refills you logged — not a pharmacy-claims measure."**

**Tests** — pdc-adherence: 6 ported verbatim. medication-fills: null for demoState; Brent ≈ 66% below threshold; insufficient history → ineligible, no percent; refill-gap draft has PDC % and NO treatment recommendation; insulin excluded + flagged. storage: pre-feature payload backfills; foreign/unknown fills dropped. store: fill logs + audits. adherence.test.ts: untouched, green.

**Commit:** `feat: refill-based PDC coverage card with refill-gap care-team draft`

## P4 — Minimal PHQ-9 with item-9 crisis routing (spec 04 FR-1/FR-4/FR-15/FR-16 subset)

1. `src/domain/assessment.ts`: `PHQ9_ITEMS` (standard unmodified wording, en/es), `AssessmentEvent { id, patientId, instrumentId: "phq9", itemResponses: number[9] (0–3), totalScore, severityBand, status: "patient_reported", recordedAt }`, pure `scorePhq9`.
2. **FR-4**: item-9 > 0 → structured crisis signal reusing the P0 pathway (crisis surface + `CRISIS_ACTIONS` + `crisis_escalated` audit), independent of total score, NOT via free-text.
3. `src/app/checkin/page.tsx`: consent/disclaimer gate on first entry (FR-16: not crisis care, not therapy, false-negative risk, 988 one tap away) → questionnaire (react-hook-form + zod, min-h-12 targets) → plain-language severity band (no diagnosis language) → stored.
4. State: `assessmentEvents` slice + guard/sanitizer/shim (atomic rule) + `addAssessmentEvent` (audit `"assessment_recorded"`). Nav: append "Check-in" tab (end of list).
5. Today feed: periodic check-in task, `kind: "checkin"` (extend `TaskItem.kind` union), priority 2; **FR-14 ranking-guard test**: priority-1 clinical task always survives the `MAX_TODAY_TASKS = 3` sort+slice (tasks.ts:102).
6. Deferred: trends, GAD-7, behavioral lenses, brief section.

**Tests**: scoring vs published PHQ-9 bands; item-9=1 & total=1 → crisis; item-9=0 & total=27 → severity copy, NO crisis routing; consent gate blocks first run; ranking guard; storage round-trip.

**Commit:** `feat: minimal phq-9 check-in with item-9 crisis routing`

## P5 — SDOH screening + resource finder (plan 03 P0 subset)

1. Port catalog → `src/domain/sdoh-resources.ts` (6 Kentucky resources, 9 need types, county-first search, honest-empty fallback) + ported tests.
2. `src/domain/social-screen.ts`: material-domain questions ONLY (food, housing, utilities, transportation, financial — PRAPARE-core style). **NO SI/mood/IPV items** — plan 03 FR-16 still gates those on the F8 return channel even with F4 built. Skippable; declines recorded (FR-14). Answers → `ExtractedFact`s, `status: "patient_reported"` (FR-2).
3. `computeSocialFlags(answers)` pure (FR-3). `screenSocialEmergency(input)`: "no food today / children hungry / out of insulin|medicine none left" → emergency-tier hard-escalate in `decideSafety` (after the crisis branch) whose banner carries explicit **"If this is an emergency, call 911"** + `EMERGENCY_ACTIONS` (FR-4).
4. `src/app/support/page.tsx`: screen → flags → matched resources (name, contact, hours, source + verified date) → **per-referral consent step** before any draft/share, audited `"shared"` (FR-6). County from `PatientProfile.county?` (new optional field; brentState = "Perry"; picker fallback when absent). Nav: append "Support" tab (HandHeart icon) at END.
5. `suggestZCodes(flags)` deterministic, `needs_review`, surfaced only in visit-brief context, never auto-applied.
6. i18n en/es for all screen/resource strings.

**Tests**: exact flags from fixed answers, zero provider calls; social-emergency phrases escalate with 911 text + emergency actions; consent required before share (audit asserted); decline recorded; county-first ordering (ported); Z-codes needs_review only.

**Commit:** `feat: sdoh screening and resource finder with material-emergency escalation`

## P6 — Accessibility rendering profiles (spec 07 FR-10 direction)

1. Port → `src/domain/accessibility.ts`: `AccessibilityPreference` union (read_aloud, large_text, screen_reader, high_contrast, keyboard_navigation), `accessibilityProfileForPatient`, `patientAccessibilitySummary`; drop the education-floor check.
2. `PatientProfile.accessibilityPreferences: AccessibilityPreference[]` (storage tolerates missing → `[]`; fixture: Jordan `["large_text"]` so the effect is demo-visible).
3. Apply at the shell (`app-shell.tsx`/layout wrapper): large_text → `text-[17px] leading-7`; high_contrast → `contrast-125` + strengthened borders; keyboard_navigation → visible focus-ring utilities. Tailwind 3 arbitrary values only.
4. Privacy page "Display & access" toggles → `updateAccessibilityPreferences` action + audit `"updated"`.

**Tests**: per-preference profile mapping; legacy state (no field) loads clean; existing component tests green.

**Commit:** `feat: patient accessibility preferences drive rendering profile`

## P7 — PhoneFrame demo route

`src/components/phone-frame.tsx` (~30 lines: `w-[390px] max-w-full h-[720px] rounded-[2.5rem] border-8 border-ink overflow-hidden shadow-xl`) + `src/app/demo/page.tsx`: bezel on `paper` backdrop, `<iframe src="/today">` (same-origin → shares localStorage → live demo), one-line caption. Not in nav; URL documented in README.

**Commit:** `feat: phone-bezel demo route for stakeholder walkthroughs`

## P8 — Ops gates, docs, final verification

1. `scripts/crisis-gate.mjs` (node, no new deps): runs the crisis vitest suite + recall measurement, writes `docs/ops/red-team-results/YYYY-MM-DD-crisis-gate.md` (Date / Command / Result / Output / Interpretation). package.json: `"crisis:gate": "node scripts/crisis-gate.mjs"`.
2. Docs: README (crisis behavior statement, check-in, support, `/demo`, Brent demo button); `docs/plans/00-foundations.md` — F4 marked LANDED → this sprint; `docs/plans/04-behavioral-health-plan.md` — P0-CRISIS0…7 satisfied, P0-A/P0-B remainder open; commit `docs/plans/08-rhtp-integration.md` (this file — already present in the working tree) as the repo record. Log the open question for clinical/legal review: hardcoded 911 vs locale-aware emergency number (kept behind the `call_emergency` action + one i18n key so a swap is a one-string change).
3. Final verification (below), then: `docs: rhtp integration sprint record and ops gate results`.

---

## Verification

Per phase: `npm run check` (lint + vitest + build) green BEFORE the phase commit.

Final sweep:
1. `npm run check` with NO `.env*` present (mock-first proof).
2. `npm run test:e2e` (Playwright; `npx playwright install` if needed) — extend `e2e/home-health.spec.ts`: typed crisis turn in Coach → 988/911 buttons with `tel:`/`sms:` hrefs + composer lock/acknowledge; PHQ-9 item-9 → crisis surface; support page screen → resources; medicines PDC card after "Load Brent demo".
3. `npm run crisis:gate` → result file written, recall ≥ 0.95, zero trap false-positives.
4. Grep guards: `grep -rn "rhtp-prototype" src/` → NOTHING (no cross-tree imports); `grep -ri "988" src/` → crisis module/i18n/panel hits; `git status` → `rhtp-prototype/` still untracked, never staged.
5. Manual pass: `npm run dev` → `/today` (check-in task), `/chat` (crisis turn end-to-end), `/support`, `/medicines` (Brent PDC), `/checkin`, `/demo`, privacy (accessibility toggles + Brent button).

## Top risks (mitigations already in the phases)

1. **Storage-guard data wipe** — types+guards+shims atomic per phase; pre-feature payload tests; lenient action filtering.
2. **Grounding false positives neutering the coach** — conservative rhtp pattern shapes; the safetyNote regression test; mode × fixture matrix; fallback always carries care-team actions.
3. **Voice gate race / fail-open** — `create_response:false` pinned by test; fail-closed transcript timer; cancel + buffer-clear; mock path runs the same gate.
4. **Crisis regex miscalibration** — strip-then-rescan negation; corpus CI with recall floor AND zero-false-positive trap set; documented bias toward escalation (spec 04 accepts it).
5. **PDC semantic honesty** — "estimate from refills you logged" labeling; ineligible → qualitative state, never a percent; insulin → review copy.

## Execution notes for Opus

- Read each rhtp source from the port-map path, copy content, adapt in place at the destination. Never modify anything inside `rhtp-prototype/`.
- Ported tests adapt to the base app's vitest 2.x idioms if 4.x APIs differ.
- If a named symbol/line has drifted, fix forward within the phase and note it in the commit body — do not stop the sprint.
- End-state: 9 commits on `master` (P0…P8), `npm run check` + `test:e2e` + `crisis:gate` all green, no push.
