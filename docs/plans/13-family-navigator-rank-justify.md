# Family Navigator II — Situation-Grounded Recommendations (Rank & Justify)

**Paste-ready end-to-end handoff for Codex. Execute P0→P5 in order, no per-phase stops. All build work lands in `C:\Patient centered\` (Next.js 15 / React 19 / TS strict / Tailwind 3 / useReducer+localStorage / vitest 2 / Playwright, Windows, npm). Solo repo, direct path-scoped commits to `master`, NO push, no PRs.**

**Codex, read this first:**

- Read `docs/specs/11-family-navigator-rank-justify.md` before P0 — it is the product spec; this plan is the execution contract. Where they disagree, this plan wins; note the deviation in the commit body.
- Verification cadence: `npm run check` AND `npm run crisis:gate` after EVERY phase. `npm run test:e2e` after P1, P2, and P5.
- Path-scoped commits only (`git commit -- <paths>`). **SHARED TREE — plan 12 (Screening Hub) is Active here. DO NOT touch:** `src/domain/assessment*`, `src/domain/instrument*`, `src/app/checkin/**`, `src/components/swyc*`, any file with `screening-hub` in its name, and no edits to `docs/plans/12-*.md`.
- House style: TS strict, no `any`, `const` over `let`, no comments/docstrings on untouched code, three similar lines beat a premature helper.
- Clinical integrity: never weaken `crisis:gate` or an existing test to get green — this plan pre-authorizes specific test rewrites in P1 and P2 and lists each one; anything beyond that list is a stop-and-report. New corpus work is **additive** with the zero-false-positive floor intact.
- The tripping safety text must NEVER reach a network call. This invariant is tested in P1 and re-asserted in P4 (the recommend call). If you find a path where it can, stop and fix before proceeding.

## Mission

Decision (user, 2026-07-21): **the model stops classifying and starts recommending.** Deterministic retrieval (county + age + domains — exactly today's semantics) produces candidates; a rank call justifies them against the caregiver's own words, id-only, doubly re-resolved, linted. `/family` crisis handling becomes banner-and-continue (988/911/ED language, acknowledge, keep helping — the tripping turn runs the mock path on-device). The catalog gains three cited procedural-guidance entries (IDEA discipline, written evaluation request, FBA/BIP). A vignette gate — deterministic tier build-breaking in `npm test`, live tier as `npm run navigator:gate` — makes recommendation quality a tested artifact. Sprint tag: `(FN2 Pn)`.

## Context — the base app today (verified 2026-07-21 at `0b034c5`)

- Extraction: `/api/family/interview` (gpt-4o-mini, temp 0, strict zod, off-shape → null → `extractFamilyInterviewMock`); `sanitizeResult` applies `filterUnsupportedDiagnosisFacts` + `stripUnsafeFamilyRationales` + `sanitizeFamilyFollowUps` to live AND mock output client-side.
- Two transcripts: Q:/A: `liveTranscript` goes to the LLM; answers-only `caregiverTranscript` is stored as `rawText` and is the grounding target for `familyFactStatus` (`rawText.includes(snippet)`, case-sensitive).
- Safety today on `/family`: `classifyCrisis || classifySafety !== "allowed" || screenSocialEmergency` → `onSafetyEscalation()` + `router.push("/chat?ask=…")`; `suppressForSafety()` wipes review + resources. The acknowledge-and-continue pattern already exists on chat (`crisisAcknowledge` strings, `acknowledgeCrisis` action, `hasUnacknowledgedCrisis` selector gating chat voice, food voice, realtime token route).
- Retrieval: `findFamilyResources` (domain ∧ age ∧ county|statewide; county-first, catalog-order tiebreak) → `buildResourceMatches` (4 non-enrolled per domain, county → actNow → catalog order, enrolled sink, FALLBACK_IDS = ky_spin/hdi_resource_guide/kynect_resources/kentucky_211 when nothing domain-specific matched).
- Unlock gate: `!safetySuppressed && family.profile && family.activeDomains.length > 0`; `activeDomains = mergeFamilyDomains(screenAnswers, latestInterviewDomains)`.
- Storage: `sanitizeFamilyNavigatorState` rebuilds the family slice from only known keys — unknown persisted fields are silently deleted; `isFamilyInterview` pins `extraction: "live"|"mock"`. Any new field = type + guard + sanitizer + backfill + pre-sprint-payload regression test, one commit.
- Catalog: 47 entries, test pins the exact ID set and `verifiedAt === "2026-07-17"` for all; `RESOURCE_NAME_PATTERN` (follow-up lint) is an alternation of full catalog names; procedural precedent exists (`kde_dispute_resolution`, `kde_age_three_transition`, `kde_parent_toolbox`).
- Gates: `crisis:gate` = six vitest files (crisis-red-flags, safety-gate, front-door, safety, voice-gate-corpus, output-guard) + dated report; corpus = 123 positives / 74 traps, recall floor 0.95 enforced as recall 1.00 + zero FP, per-case expected domains. No harm-to-others/animal coverage anywhere (animals appear only as missing-pet traps).

## What already exists — DO NOT rebuild

1. Retrieval, fallback, enrolled-sink, nearby-recreation — reuse `buildResourceMatches` / `buildNearbyTherapeuticRecreation` as the candidate generator, unchanged.
2. The three lint functions and `containsFamilyDiagnosisClaim` — reuse for `heard`/`why`; do not fork the regexes.
3. `urgent-help.tsx` (real `tel:988`/`sms:988`/`tel:911` links), `tSafety` crisis copy, `crisisTierForDomain` — the banner composes these.
4. The env/passcode/envelope discipline of `route.ts` — clone it for the recommend route; do not invent a new envelope.
5. `crisis-gate.mjs` harness shape — clone for `navigator-gate.mjs` (own filename pattern `<date>-navigator-gate.md`, never collide with the crisis report).
6. Basics prefill (`family-basics-extract.ts`) — untouched.

## Scope decisions (locked)

1. **No new `DevNeedDomain` value.** Procedural entries ride under `school_iep` (+`therapies` for FBA/BIP).
2. **Rank never expands retrieval.** Candidate ids come from today's deterministic matching; the model orders and explains, nothing else. Screen-only users (zero interviews) never invoke rank.
3. **Banner-and-continue continues on the MOCK path for the tripping turn.** Crisis text stays on-device, always. Live calls resume on subsequent clean turns.
4. **`heard`/`why` may not claim diagnoses** (existing lint) **and `why` may not name any catalog resource except its own card's.** Every lint drop degrades to the deterministic equivalent — no dead ends.
5. **`becauseYouSaid` is verbatim or gone**: `caregiverTranscript.includes(snippet)` re-checked at render time.
6. **Recompute rules:** new interview replaces `recommendations`; screen resubmit / enrollment toggle re-order deterministically without re-ranking; stale set (`interviewId` ≠ latest) → deterministic ordering.
7. **Models:** extraction stays `HEALTH_AI_INTERVIEW_MODEL || "gpt-4o-mini"`; rank is `HEALTH_AI_RANK_MODEL || "gpt-4o"`, temp 0, 15s, json_object.
8. **Catalog dates:** relax the single-date test to per-entry valid ISO date ≤ today; existing 47 keep `2026-07-17`; new entries carry their own date + `humanVerify: true`.
9. **New entries append at the end of the hand-written catalog block** — catalog order is a sort tiebreak; insertion position is behavior.
10. **Live vignette tier never gates the build.** Deterministic tier lives in `npm test` with zero env.

## Non-goals (do not build)

- No new AiMode, no coach/chat changes, no front-door changes, no `/chat?ask=` changes.
- No notifications, no re-rank button (fast-follow candidate), no eligibility conclusions, no income field, no legal-outcome language.
- No day-count claim for the KY evaluation timeline until `humanVerify` is cleared by the user.
- No edits to plan-12 files or screening seams.

## Guardrails (every phase)

- `npm run check` + `npm run crisis:gate` green before every commit; corpus changes additive-only; zero FP floor holds.
- Any new persisted field lands atomically with guard + sanitizer + backfill + regression test.
- en/es parity: every new `FamilyStringKey` and `tSafety` key lands in both tables in the same commit (parity test enforces).
- All quote-grounding checks target the caregiver transcript (`meta.rawText`), never the Q:/A: live transcript.

## Cross-cutting contract (P0/P4 establish; everything compiles against it)

```ts
// types.ts
export type FamilySafetyEvent = {
  id: string;
  tier: "crisis" | "emergency";
  domain: string;                       // CrisisDomain | "safety" | "social"
  createdAt: string;
  acknowledgedAt?: string;
};
export type FamilyRecommendationItem = {
  resourceId: string;
  why?: string;
  becauseYouSaid?: string;
  urgency: "act_now" | "soon" | "when_ready";
};
export type FamilyRecommendationSet = {
  interviewId: string;
  createdAt: string;
  extraction: "live" | "mock";
  heard: string;
  lead: DevNeedDomain;
  items: FamilyRecommendationItem[];
};
// FamilyNavigatorState += safetyEvents: FamilySafetyEvent[]; recommendations: FamilyRecommendationSet | null;

// /api/family/recommend — body (strict): { text: string(10..5000), profile, language: "en"|"es",
//   passcode?: string, candidateIds: string[](1..24) }
// reply data: { heard: string(1..600), lead: DevNeedDomain,
//   recommendations: [{ id, why?: string(..300), becauseYouSaid?: string(..200),
//                       urgency: "act_now"|"soon"|"when_ready" }](0..12) }
// envelope: unconfigured | locked | success (identical semantics to the interview route)

// src/domain/family-vignettes.corpus.ts
export type FamilyVignette = {
  id: string;
  language: "en" | "es";
  text: string;
  profile: FamilyProfile;
  expectedLead: DevNeedDomain;
  mustIncludeIds: string[];
  mustNotIncludeIds: string[];        // asserts "never lead with reading help for a discipline case"-class failures
  expectSafetyBanner: boolean;
  reviewedBy?: string;                // empty = engineering draft pending clinician sign-off (module header says so)
  reviewedAt?: string;
};
```

**LOCKED — new `tSafety` copy (en; provide es parity):** `harmToOthersResponse`: "Keeping everyone safe comes first. If anyone is in immediate danger, call 911 now. For urgent concerns about your child's behavior, you can go to the nearest emergency department, and you can call or text 988 — they also help people who are worried about someone else. Please tell your child's pediatrician what is happening. When you're ready, we can keep looking for support programs together."

**LOCKED — banner behavior:** non-dismissible until acknowledged; renders `urgent-help` links; acknowledge button reuses the `crisisAcknowledge` string pair; show → audit "Family safety resources shown"; acknowledge → audit "Family safety resources acknowledged"; all voice mics (chat, food, family follow-up) locked while any family safety event is unacknowledged.

---

## P0 — Harm-to-others rules + corpus + copy (classifier layer; UI behavior unchanged)

**Build:**

- `src/domain/crisis-red-flags.ts`: add `"harm_to_others"` to `CrisisDomain`; `crisisTierForDomain` maps it to `"crisis"`. New EN+ES rules for caregiver-reported harm to animals ("harmful to/towards animals", "hurts/killed the cat/dog/animals") and to people (threats or acts toward classmates/siblings/other kids, weapon-at-school mentions), following the existing rule/denial-pattern shape with negation-span stripping.
- `src/domain/crisis-red-flags.corpus.ts`: ≥ 6 positives (incl. the Breathitt phrase "He has been harmful towards animals", an es case, a threat-to-classmate case) and ≥ 4 traps ("he's rough with the dog sometimes", "they fight over toys", "he hurt himself at recess" already present — keep, "she chased the cat around the yard"). Zero-FP floor and recall floor must hold; every positive carries `expectedDomain: "harm_to_others"`.
- `src/i18n/strings.ts`: `harmToOthersResponse` en+es (locked copy above). `src/ai/safety-gate.ts`: map `harm_to_others` → `harmToOthersResponse` + `CRISIS_ACTIONS`; additive tests in `safety-gate.test.ts` (en+es).
- Note: front-door + voice-gate corpus tests pick the new positives up automatically (entry-time coach routing is correct and unchanged). The existing `/family` redirect now also fires for these — accepted for one phase; P1 replaces it.
- Run `npm run check`, `npm run crisis:gate`.

**Commit:** `feat: harm-to-others crisis domain with corpus and standard escalation copy (FN2 P0)`

## P1 — The family safety banner: acknowledge-and-continue

**Build:**

- `src/domain/types.ts` + `src/state/storage.ts`: `FamilySafetyEvent`, `safetyEvents: []` on the family slice — guard `isFamilySafetyEvent`, sanitizer key, load-time backfill. Regression test: a pre-sprint family payload (no `safetyEvents`) loads intact; a payload with an unknown extra key still sanitizes without reset.
- `src/state/store.tsx`: `recordFamilySafetyEvent { event }` (appends + audit "Family safety resources shown"), `acknowledgeFamilySafetyEvent { eventId, at }` (stamps `acknowledgedAt` + audit "Family safety resources acknowledged").
- `src/state/selectors.ts`: `hasUnacknowledgedCrisis` also true when any family safety event lacks `acknowledgedAt`. Verify all four consumers lock: chat voice, food voice, realtime token route, and — new — `FamilyFollowUpTurn.beginVoice` refuses to start while it is true (add the check).
- `src/components/family-crisis-banner.tsx`: tier copy selection — crisis domain → `crisisResponse` / `abuseResponse` / `harmToOthersResponse` by domain; `classifySafety` escalate → `emergencyResponseSuffix` framing; social → `socialEmergencyResponse`; `urgent-help` links; acknowledge button (`crisisAcknowledge` strings).
- Rewire the two submit paths (`family-interview.tsx` submit; `family-orientation-interview.tsx` answerFollowUp): on safety match → dispatch `recordFamilySafetyEvent`, **do not** `router.push`, **do not** call `requestFamilyInterview`; run `extractFamilyInterviewMock` on the tripping text locally and continue the turn (`extraction: "mock"`). Delete `suppressForSafety`'s wipe semantics from `family-experience.tsx`; the banner renders at the top of the interlude, thread/review/resources survive.
- **Pre-authorized test rewrites (each asserts the new behavior; nothing else changes):** `family-interview.test.tsx` routes-before-network table → asserts no `push`, no `requestFamilyInterview`, banner event dispatched, mock extraction ran; `family-orientation-interview.test.tsx` ~139/~278 → same for follow-up answers incl. voice provenance; `family/page.test.tsx` ~572/~587 → banner visible, review + resources NOT removed, mic locked until acknowledge, acknowledge unlocks; e2e `family-navigator.spec.ts` 417–434 + 487–508 → banner beats replace redirect beats (`familyApiRequests === 0` for the tripping turn stays asserted — the invariant survives, the UI response changes).
- Run `npm run check`, `npm run crisis:gate`, `npm run test:e2e`.

**Commit:** `feat: family safety banner — acknowledge and continue, crisis text stays on-device (FN2 P1)`

## P2 — Procedural catalog entries + test rework

**Build:**

- `src/domain/family-resources.ts`: append `idea_school_discipline`, `kde_evaluation_request`, `fba_bip_request` (fields, names, domains, ages 3–21, statewide, referral modes, citations-in-text, `actNow` on the evaluation request, `humanVerify: true`, own `verifiedAt`) at the END of the hand-written block, per spec §Catalog Additions.
- `src/domain/family-resources.test.ts`: pinned ID set += 3; replace the single-date assertion with per-entry valid-ISO-date ≤ today; extend the humanVerify-policy test to name the three new ids.
- `src/domain/family-follow-up-lint.test.ts`: regression — `sanitizeFamilyFollowUps` keeps "Have you sent the school a written evaluation request?" (proper-noun-anchored names must keep `RESOURCE_NAME_PATTERN` narrow).
- **Pre-authorized e2e re-pins** (deterministic ordering shifts because `kde_evaluation_request` has `actNow`): re-verify and, only where actually shifted, re-pin `family-navigator.spec.ts` :215 (Scott county-first card — expected unchanged), :220, :291, :309–310. Any other ordering change = stop and report.
- Run `npm run check`, `npm run crisis:gate`, `npm run test:e2e`.

**Commit:** `feat: IDEA discipline, written evaluation request, and FBA/BIP procedural catalog entries (FN2 P2)`

## P3 — Vignette corpus + deterministic gate + live gate script

**Build:**

- `src/domain/family-vignettes.corpus.ts`: ≥ 24 vignettes (≥ 6 es), typed per the contract; module header states unreviewed entries are engineering drafts. Case #1 = Breathitt (expectSafetyBanner true, expectedLead `school_iep`, mustInclude the three P2 ids, mustNot: reading-focused leads like `kde_parent_toolbox` as *first* item — encode mustNot as "not in the top 3").
- `src/domain/family-vignettes.test.ts` (runs in `npm test`, zero env, build-breaking): per vignette — mock extract → domains → retrieve (`buildResourceMatches` extracted to a pure helper if needed for testability) → assert expectSafetyBanner via the classifiers, mustInclude ⊆ retrieved, mustNot respected, fallback honesty (fallback cases assert `isFallback`). Lead assertions activate in P4 when the mock ranker exists — leave them `todo`-tagged here, not silently skipped.
- `scripts/navigator-gate.mjs` + `package.json` script `navigator:gate`: requires `HEALTH_AI_API_KEY` (exit with a clear message if absent); imports the shared prompt builders (created in P4 — for this phase the script scaffolds corpus loading + report writing and marks the live call "pending P4"); writes `docs/ops/red-team-results/<date>-navigator-gate.md` (per-vignette rows + aggregate lead-accuracy; PASS threshold 0.8 advisory).
- Run `npm run check`, `npm run crisis:gate`.

**Commit:** `feat: family vignette corpus with deterministic build gate and navigator-gate scaffold (FN2 P3)`

## P4 — /api/family/recommend + mock ranker + persistence

**Build:**

- `src/ai/family-rank-prompt.ts` (shared by route + gate script): builds system + user prompts from catalog entries (id, name, summary, referralMode, ages, county tier, actNow) + caregiver transcript + profile; system prompt: id-only selection from the provided list, justify against the family's words, quote verbatim in `becauseYouSaid`, never assert a diagnosis, never name a different program inside a `why`, answer in the request language.
- `src/app/api/family/recommend/route.ts`: clone the interview route's gates (env pair, DEMO_PASSCODE, envelope, 15s, temp 0, json_object); model `HEALTH_AI_RANK_MODEL || "gpt-4o"`; strict body per contract; server-side `getFamilyResourceById` re-resolution (unknown ids dropped before prompting AND after reply); off-shape → `{mode:"success", data:null}`. Route tests mirror `route.test.ts` coverage classes (unconfigured/locked/bad-body/timeout/off-shape/happy).
- `src/domain/family-rank.ts`: `rankFamilyResourcesMock(candidates, activeDomains, rawText, language)` → same shape, deterministic (current prioritization order; lead = first active domain in DOMAIN_ORDER; static rationale strings as `why`; `becauseYouSaid` reused from mock-extractor concern snippets when they ground). Plus `validateRecommendationSet(data, candidateIds, rawText, childFirstName)` — the full client lint chain from spec FR-3, pure and unit-tested both directions (drops hallucinated id, strips diagnosis-claim `why`, strips other-resource-name `why`, drops ungrounded quote, degrades to fallback text; keeps clean output byte-identical).
- `src/ai/family-recommend-provider.ts`: client provider (15s abort, envelope parse, null on any failure — mirror `family-interview-provider.ts`).
- Persistence: `FamilyRecommendationSet` on the family slice + `setFamilyRecommendations` action — guard, sanitizer, backfill, pre-sprint-payload regression test, atomically.
- Wire the call in `family-experience.tsx`: fires when profile ∧ activeDomains ∧ ≥1 interview ∧ (no stored set ∨ stored set stale); tripping-turn safety rule re-asserted: a turn that recorded a safety event never calls the recommend route (test).
- Complete `navigator-gate.mjs`: live extract + rank per vignette via the shared builders; report generation per P3 format. Activate the `todo` lead assertions in `family-vignettes.test.ts` against the mock ranker.
- Run `npm run check`, `npm run crisis:gate`.

**Commit:** `feat: retrieve-rank-justify recommend route with mock ranker, validation chain, and persistence (FN2 P4)`

## P5 — Rank UI + heard narrative + es parity + docs

**Build:**

- `family-experience.tsx` + `family-resource-card.tsx`: render `heard` as the resources-section lead (replacing the enum rationale list when a valid set exists — the "Why we are showing this" block remains the fallback); order cards by rank; per-card `why` line, "You said: '{quote}'" (render-time `includes` re-check), urgency chip (`act_now` composes with catalog `actNow` styling); enrolled-sink, save/share, nearby-recreation, fallback, and empty states byte-identical when no valid set exists.
- New `FamilyStringKey` entries (heard intro, urgency labels, quote prefix, mock-path `why` strings) en+es in one commit; parity test green.
- e2e: extend `family-navigator.spec.ts` with the Breathitt beat on the mock path (banner + continue + discipline-lead ordering from the mock ranker); assert es variant copy.
- Docs housekeeping: `docs/specs/README.md` add rows 11 **and the missing 12**; `docs/plans/README.md` lifecycle row for plan 13 (Active) ; spec 09 row noted "amended in part by spec 11". Commit this plan file + spec 11 with it if not already committed.
- Run `npm run check`, `npm run crisis:gate`, `npm run test:e2e`.

**Commit:** `feat: ranked why-this resource cards with heard narrative and es parity (FN2 P5)`

**STOP — do not push.** Report: phases landed, `check` / `crisis:gate` / `test:e2e` outputs, the deterministic vignette-gate pass count, which e2e assertions were re-pinned and why, and the `humanVerify` items awaiting the user (three catalog sources + KY evaluation day-count). Deploy is a separate user-triggered `/ship-phase`.

---

## Acceptance demo (must be clickable at the end)

1. `/family` (no key): paste the Breathitt paragraph → facts review + basics prefill → **banner** (911/ED/988 copy, real `tel:` links, mic locked) → "I've seen this — continue" → resources render with `heard` naming repeated school removal; top three include the IDEA discipline + written-evaluation + FBA/BIP entries; a reading-help entry is not first; every card still shows source + checked-date from the catalog.
2. Reload mid-crisis (before acknowledging): banner re-renders unacknowledged; localStorage sanitize did not reset the app.
3. `/family?k=<passcode>` with env set: same flow on the live path; justifications name no diagnosis, quote only verbatim caregiver words; toggling es re-runs with Spanish copy + the existing English-catalog notice.
4. Needs-screen-only user (no interview): today's deterministic cards and rationales, no rank call fired (network tab clean).
5. `npm run navigator:gate` with a key: dated report lands in `docs/ops/red-team-results/`, Breathitt row shows lead-match true.

## If something conflicts

The load-bearing invariants, in order: (1) crisis text never leaves the device — the tripping turn is mock-only, always; (2) storage lenient-sanitize — never a reset-to-demo vector; (3) `crisis:gate` corpus additive-only, zero FP, recall floor — and front-door crisis precedence untouched; (4) the model selects ids only from the deterministic candidate set — retrieval never expands; (5) every lint drop degrades to deterministic copy — no dead ends; (6) en/es parity; (7) zero-env green `check` including the deterministic vignette tier. Never weaken `crisis:gate` or an existing test to get green; the only sanctioned rewrites are the P1/P2 pre-authorized lists.
