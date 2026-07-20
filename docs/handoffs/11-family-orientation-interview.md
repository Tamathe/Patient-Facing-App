# Handoff: Interview-led Family Navigator (orientation interview with follow-up chips)

**Repo:** `C:\Patient centered\.claude\worktrees\sleepy-bhaskara-23f161`
**Branch:** `claude/sleepy-bhaskara-23f161` (worktree of `C:\Patient centered`, main branch `master`)
**Stack:** Next.js App Router, TypeScript strict, Tailwind, Zod, Vitest + Testing Library, vitest jsdom.
**Verify with:** `npm run check` (= `next lint && vitest run && next build`) and `npm run crisis:gate`.

Execute P0…P5 in order, committing after each phase. Do not stop between phases for approval. No git worktrees; work directly in the path above. Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`). Do not push.

---

## Goal

Promote the LLM interview to **lead** the `/family` page as a multi-turn "orientation interview":

1. Family free-form describes their situation (typed or Web Speech voice) — the existing `FamilyInterview` composer, unchanged.
2. After the first extraction, the LLM's follow-up questions render as a **guided Q&A thread** — one question at a time, each with **tappable answer chips** plus a short free-text input.
3. Each answer re-runs extraction on the **cumulative** text. Matched resources appear after the **first** successful extraction and refine as answers land (no gate on finishing follow-ups).
4. Cap at **2 follow-up rounds** so it stays an orientation, not an interrogation.
5. The 8-question tap screen (`FamilyNeedsScreen`) is **demoted to a collapsed disclosure** ("Prefer simple questions?") below the results — it stays fully functional as the no-LLM accessible path.

**The key enabler:** follow-up plumbing already exists end to end (route prompt asks for `followUps`, the schema carries them, a "Questions to consider" UI renders them) but is deliberately severed at `sanitizeResult` in `src/components/family-interview.tsx:72`, which hard-codes `followUps: []`. You are un-severing that wire and making it interactive.

---

## Current-state facts you can trust (verified; re-verify only if something looks off)

### Page flow — `src/components/family-experience.tsx`
Render order inside the `family?.profile` gate (opens line 321, closes 546):
- lines 323–344: two entry anchor cards (jump links to `#family-screen-title` / `#family-interview-title`)
- 346–351: `<FamilyNeedsScreen>` (`key={family-screen-${seedVersion}}`, `initialAnswers`, `onSubmit={submitScreen}`)
- 353–369: interview section (`id="family-interview-title"`) wrapping `<FamilyInterview>`
- 371–417: review-facts section, gated `!safetySuppressed && (reviewFacts.length > 0 || reviewDetails)`; contains fact cards (383–390), domain rationales (391–403), and the **followUps list at 404–415** (dead code today — `followUps` is always `[]`)
- 419–507: matched resources, gated `!safetySuppressed && family.activeDomains.length > 0`; branches on `matchResult.isFallback`; then nearby-therapeutic-recreation subsection (475–505)
- 509–542: saved resources; 544: `<FamilyStageTimeline>`

Local state: `reviewDetails` (176, type at 51–54 — `{domains, followUps}`), `safetySuppressed` (177), `seedVersion` (178, bumped on seed to remount profile form + needs screen via `key`). Handlers: `seedExample` (227–233), `saveProfile` (237), `submitScreen` (242), `addInterview` (245–276), `saveResource` (279), `shareResource` (287), `suppressForSafety` (292–296). `buildResourceMatches` lives here (91–143) — **do not touch the matching pipeline**.

### Store — `src/state/store.tsx`, types in `src/domain/types.ts:369–379`
`family` slice: `profile`, `interviewDraft`, `screenAnswers`, `interviews[]`, `facts[]`, `latestInterviewDomains`, `activeDomains`, `saved`, `alreadyEnrolled`. Actions: `saveFamilyProfile` (484), `setFamilyInterviewDraft` (489), `submitFamilyScreen` (494–517), `addFamilyInterview` (518–537), `confirmFamilyFact` (538), `saveFamilyResource` (551), `toggleFamilyEnrollment` (559), `seedExampleFamily` (572–576, replaces family with `morganFamilyState`/`caseyFamilyState` from `src/domain/family-fixtures.ts`).

`addFamilyInterview` sets `latestInterviewDomains = [...new Set(action.domains)]` then `activeDomains = mergeFamilyDomains(screenAnswers, latestInterviewDomains)` (union with tap-screen "yes" domains). **`interviews` is already an array — state holds multiple rounds with no reducer change.**

### Interview composer — `src/components/family-interview.tsx`
- `FAMILY_INTERVIEW_MAX_CHARS = 5000` (15), `FAMILY_INTERVIEW_MIC_DISABLE_AT = 4950` (18).
- Exported types: `SanitizedFamilyInterviewResult` (34–36), `FamilyInterviewSubmissionMeta` (38–42, `{extraction: "live"|"mock", source: "typed"|"voice"|"mixed", rawText}`), `FamilyInterviewProps` (44–52).
- `sanitizeResult` (63–74): runs `filterUnsupportedDiagnosisFacts` + `stripUnsafeFamilyRationales`, **hard-codes `followUps: []` at line 72**.
- `submit` (235–295) order, which must be preserved: snapshot → validate `familyInterviewInputSchema` → **safety gate (257–265)** → `requestFamilyInterview` (15s) → on null/throw `extractFamilyInterviewMock` → stale-context guard → `onExtracted(sanitizeResult(...), meta)`.
- Safety gate: `classifyCrisis(rawText).matched || classifySafety(rawText).level !== "allowed" || screenSocialEmergency(rawText)` → `onSafetyEscalation?.()` + `router.push('/chat?ask=' + encodeURIComponent(rawText))` and **return before any network call**.
- Voice: Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`), final results only, `es-US`/`en-US`. No passcode dependency.

### Schema + mock — `src/domain/family-interview.ts`
- `devNeedDomainSchema` (7–19): 11 domains.
- `familyInterviewInputSchema` (21–24): max 5000 chars, trimmed length ≥ 10.
- `familyInterviewResultSchema` (41–47, `.strict()`): `facts[{label,value,sourceSnippet}]`, `domains[{domain,rationale}]`, **`followUps: z.array(z.string())` at line 45** ← the field you are replacing.
- `parseFamilyInterviewPayload` (90–93): safeParse → `null` on failure.
- `extractFamilyInterviewMock` (182–259): EN+ES keyword regexes → domains; **returns `followUps: []` at line 257** ← where mock follow-ups get generated.
- `familyFactStatus` (261–263): `rawText.includes(sourceSnippet)` → `patient_reported`, else `inferred`.

### Route — `src/app/api/family/interview/route.ts`
Direct OpenAI chat-completions fetch (no `src/ai` provider class). Model `HEALTH_AI_INTERVIEW_MODEL || "gpt-4o-mini"`, `temperature: 0`, **`max_tokens: 900` (line 129)**, `response_format: {type:"json_object"}`, 15s abort. `systemPrompt()` at 68–77 (the JSON template is line 71). Gates in order: strict body schema → provider/key (`unconfigured`) → `DEMO_PASSCODE` (`locked`). Returns `{mode:"success", data}`; every failure → `data: null`. **No safety gate in the route** — it is client-side only, by design.

### Client helper — `src/ai/family-interview-provider.ts`
`requestFamilyInterview({text, profile, passcode?, language})` → `FamilyInterviewResult | null`. Every failure mode (locked, unconfigured, non-OK, malformed, off-shape, network, abort) collapses to `null`, so the deterministic mock owns all non-success cases.

### Sanitizers — `src/domain/family-diagnosis-lint.ts`
`containsFamilyDiagnosisClaim(text, childFirstName?)` (131–162) — reuse this for follow-up questions/chips. Also `stripUnsafeFamilyRationales` (164), `filterUnsupportedDiagnosisFacts` (371).

### i18n — `src/i18n/family-strings.ts`
`FamilyStringKey` union (3–180), `en` block (183–361), `es` block (362–540), `tFamily(language, key, vars?)` (543–556) with `{var}` interpolation and en fallback. The `Record<Language, Record<FamilyStringKey, string>>` type **compile-enforces en/es parity** — a missing es key is a type error.

### Safety modules (do not modify)
`src/domain/safety.ts` (`classifyCrisis`, `classifySafety`), `src/domain/crisis-red-flags.ts` (incl. `caregiver_collapse` domain), `src/domain/social-screen.ts` (`screenSocialEmergency`), `src/ai/safety-gate.ts`. `npm run crisis:gate` runs the red-team suite and must stay PASS.

---

## Design decisions (already settled — implement as specified)

**Component architecture.** Create a new orchestrator `FamilyOrientationInterview` that renders the existing `FamilyInterview` **untouched** as the opening (round-0) composer, then owns the thread. Do **not** grow `FamilyInterview` into the orchestrator — its 436-line test file locks voice/atomic-submit/invalidation behavior that must not churn, and follow-up answers have different validation (a chip answer like "Not yet" is under the 10-char `familyInterviewInputSchema` minimum). A second leaf component `FamilyFollowUpTurn` renders one question + chips + short input.

**Thread state is component state, not store.** Keyed `family-orientation-${seedVersion}` for seed remounts. **No reducer changes.** Each round dispatches the existing `addFamilyInterview`. Consequences, all accepted deliberately:
- A mid-thread refresh loses the thread UI but keeps store state (interviews, facts, activeDomains, resources) — the page degrades to a fresh composer plus already-matched resources.
- `interviews[]` grows one entry per round (rawText cumulative); `facts` accumulates per round, but the review section already filters to `latestInterviewId` so only the newest set renders. A fact confirmed in round N must be re-confirmed if round N+1 re-extracts it — acceptable.
- `latestInterviewDomains` **replace** semantics stay correct because each round re-extracts the full cumulative text (a superset), so replace behaves as monotonic refinement; screen answers still union in via `mergeFamilyDomains`.

**Two transcript serializations — never truncate family words.**
- `fullTranscript` (sent to the live route): `opening + "\nQ: <question>\nA: <answer>"` per answered round. The system prompt is taught that `Q:` lines are the navigator's own questions.
- `familyOnlyTranscript` (used for `extractFamilyInterviewMock`, `filterUnsupportedDiagnosisFacts`, `familyFactStatus`, and stored as `interview.rawText`): `opening + "\n" + answers.join("\n")` — no navigator text, so question keywords can never fabricate mock domains or fake `sourceSnippet` support. (A live snippet quoting question text simply fails the `rawText.includes` check and demotes to "inferred" or gets dropped — safe direction.)
- Cap strategy: `fullTranscript` must satisfy the 5000-char route schema. Answer input capped at 500 chars (`FAMILY_FOLLOW_UP_ANSWER_MAX`). Before offering another question, compute headroom = `5000 − fullTranscript.length − (200 question + 500 answer + 8 markers)`; if negative, end the thread gracefully with the completion message rather than truncating anything.

**Round cap:** `FAMILY_ORIENTATION_MAX_ROUNDS = 2`, exported from the orchestrator. Show one question at a time — the first sanitized, not-yet-asked follow-up from the latest extraction (exact-string dedupe against asked questions).

**Per-turn safety gate (non-negotiable):** every follow-up answer runs the same three checks before any network call, with the same escalation (`onSafetyEscalation()` + `router.push('/chat?ask=…')` + thread reset).

---

## P0 — Domain layer: schema, mock follow-ups, lint module

### P0.1 Schema — `src/domain/family-interview.ts`
Replace `followUps: z.array(z.string())` (line 45) with a strict object array:

```ts
const familyFollowUpSchema = z
  .object({
    question: z.string().min(1).max(200),
    options: z.array(z.string().min(1).max(60)).max(4)
  })
  .strict();
// inside familyInterviewResultSchema:
followUps: z.array(familyFollowUpSchema).max(3)
```

Export `export type FamilyFollowUp = z.infer<typeof familyFollowUpSchema>;`. Old string-array payloads now fail `parseFamilyInterviewPayload` → `null` → mock fallback. That is intended, not a regression.

### P0.2 Mock follow-ups — same file
Add `buildMockFollowUps(domains: DevNeedDomain[], language: Language): FamilyFollowUp[]`, called at the end of `extractFamilyInterviewMock` in place of `followUps: []` (line 257). Design:
- A priority-ordered table keyed by domain, each entry one question + 3 chips, all via `tFamily` keys: `school_iep`, `therapies`, `waivers_financial`, `respite`/`parent_support`.
- If no domains matched: two generic orientation questions (hardest part of a typical day; who helps the family right now) with chips.
- Return at most 3 (the orchestrator consumes them across rounds).
- **Hard invariant, unit-tested:** every canned question and chip string, fed alone through `extractFamilyInterviewMock`, may re-match only its own domain or nothing — never introduce a new domain — and must contain no organization names. Say "help before age three", never "First Steps". Watch the mock's own regexes when wording: e.g. a `school_iep` question containing the word "school" is fine (same domain), but must not contain "therapy", "waiver", "break", "sibling", "ride", etc.

Suggested English copy (adapt, keeping the invariant):
- school_iep — "What has the school offered so far?" / chips: "Nothing yet" · "A meeting is planned" · "An evaluation was done"
- therapies — "Has anyone talked with you about therapy visits?" / chips: "Not yet" · "We are on a list" · "We go now"
- waivers_financial — "Have you applied for any state programs yet?" / chips: "Not yet" · "Applied, still waiting" · "Not sure"
- respite/parent_support — "Who can take over for a few hours?" / chips: "No one right now" · "Family sometimes" · "A paid helper"
- generic — "What part of a typical day is hardest?" / chips: "Mornings" · "After school" · "Bedtime"; "Who helps your family right now?" / chips: "No one" · "Family or friends" · "A professional"

Spanish equivalents go in the `es` block (natural translation, same invariant).

### P0.3 New `src/domain/family-follow-up-lint.ts`
```ts
export function sanitizeFamilyFollowUps(
  followUps: readonly FamilyFollowUp[],
  childFirstName?: string
): FamilyFollowUp[]
```
Rules:
- Drop any follow-up whose **question or any option** trips `containsFamilyDiagnosisClaim` (import from `./family-diagnosis-lint`).
- Drop any follow-up naming a catalog resource: build a case-insensitive deny regex from `FAMILY_RESOURCE_CATALOG` names (`./family-resources`) plus `\b211\b`, `kynect`, `KY-SPIN`, `Michelle P\.`, `First Steps`.
- Drop questions containing no `?` or `¿` (statements and advice are not questions).
- Trim, dedupe options, defensively `slice(0, 3)` follow-ups and `slice(0, 4)` options.

### P0.4 i18n
Add the mock follow-up keys (`followUpSchoolIepQuestion`, `followUpSchoolIepChip1..3`, same for `Therapies`, `Waivers`, `Respite`, plus `followUpGenericDayQuestion`/`Chip1..3` and `followUpGenericHelpQuestion`/`Chip1..3`) to the `FamilyStringKey` union and **both** the en and es blocks.

### P0.5 Tests
- `src/domain/family-interview.test.ts`: update `validPayload.followUps` to the new shape; add contract cases rejecting `followUps: ["string"]`, >3 follow-ups, >4 options, over-length question/option, unknown keys inside a follow-up. Add mock tests: domain-conditional follow-ups with chips (EN + ES), generic questions when nothing matched, and the no-new-domain / no-org invariant looped over every canned string.
- New `src/domain/family-follow-up-lint.test.ts`: diagnosis-claim question dropped; org-name chip drops the whole follow-up; non-question dropped; caps and dedupe.

**Commit:** `feat: add follow-up question schema and deterministic mock follow-ups`
Nothing downstream breaks yet — the composer still hard-codes `followUps: []`.

---

## P1 — Route prompt

`src/app/api/family/interview/route.ts`, `systemPrompt()` (68–77):
- Update the JSON template (line 71) to `…,"followUps":[{"question":"","options":["",""]}]}`.
- Add bounds: "followUps: at most 3 short orientation questions, each with 2 to 4 suggested short answers under 60 characters in options; questions under 200 characters, plain language, ending with a question mark."
- Add the transcript convention: "In the caregiver interview, lines beginning with \"Q:\" are questions the navigator already asked and lines beginning with \"A:\" are the caregiver's replies. Extract facts and domains only from the caregiver's words; never repeat a question already asked."
- Extend the existing no-organizations guard (line 75) to cover "rationales, followUps questions, and options."
- **Keep the prompt free of catalog names** — `route.test.ts` asserts the prompt does not match `/KY-SPIN|Michelle P\.|First Steps|catalog|resource name/i`.
- Bump `max_tokens` 900 → 1200 (line 129); chips add output volume.

No body-schema change — cumulative text rides the existing `text` field.

Update `src/app/api/family/interview/route.test.ts`: prompt assertions for the new template/bounds/`Q:` convention; add an off-shape case (`followUps: ["string"]` from the model → `data: null`); keep the no-catalog-names regex assertion.

**Commit:** `feat: teach interview route to return follow-up questions with chips`

---

## P2 — Un-sever the composer wire

`src/components/family-interview.tsx`:
- Line 72: `followUps: []` → `followUps: sanitizeFamilyFollowUps(result.followUps, profile.childFirstName)`.
- **Export `sanitizeResult`** so the orchestrator reuses the exact same sanitization.
- Change nothing else — safety-gate-first ordering, voice, atomic submit stay byte-identical.

Update `src/components/family-interview.test.tsx`: rewrite the "drops all live followUps" test (lines 116–133) into "sanitizes live follow-ups: drops diagnosis-claim and org-name questions, keeps safe ones with chips". Leave the safety tests (183–203) and voice/atomic-submit tests untouched.

**Commit:** `feat: surface sanitized follow-up questions from the interview composer`

---

## P3 — New components

### `src/components/family-follow-up-turn.tsx`
Props: `{ question: FamilyFollowUp; round: number; roundCap: number; language: Language; submitting: boolean; onAnswer: (text: string, via: "chip" | "typed") => void }`.
Renders: round counter ("Question {round} of {max}", `aria-live="polite"`); the question as a heading with `tabIndex={-1}` (focus target); chip buttons (`min-h-12`, each submits its own text with `via: "chip"`); a short text input (500-char cap, non-empty validation, its own submit button, `via: "typed"`). Disable all controls while `submitting`. Follow Tailwind conventions from `family-needs-screen.tsx` (`CONTROL_FOCUS`, `rounded-control`, `min-h-12`, `break-words`).

### `src/components/family-orientation-interview.tsx`
Props: `{ profile, draft, passcode, language, onDraftChange, onInterviewExtracted(result, meta, { round }), onSafetyEscalation }`.
State: `{ openingText, rounds: Array<{question: FamilyFollowUp; answer?: string}>, pendingFollowUps: FamilyFollowUp[], status: "idle" | "active" | "submitting" | "complete" }`.
Export `FAMILY_ORIENTATION_MAX_ROUNDS = 2` and `FAMILY_FOLLOW_UP_ANSWER_MAX = 500`.

- **idle:** render `<FamilyInterview>` unchanged. On its `onExtracted(result, meta)` → call `onInterviewExtracted(result, meta, {round: 0})`, seed the thread from `meta.rawText` + `result.followUps`, go `active` (or `complete` if no follow-ups survived).
- **active:** chat-log rendering — family opening bubble, answered Q/A bubbles, then the current `<FamilyFollowUpTurn>` — plus a "Start a new description" reset button that returns to idle.
- **On answer:**
  1. **Safety gate on the answer text first** — `classifyCrisis(text).matched || classifySafety(text).level !== "allowed" || screenSocialEmergency(text)` → `onSafetyEscalation()` + `router.push('/chat?ask=' + encodeURIComponent(text))` + reset thread; **no network call**. (Earlier segments were each gated at their own submission.)
  2. Build both transcripts; verify the 5000-char cap.
  3. `requestFamilyInterview({text: fullTranscript, profile, passcode, language})`; on `null`/throw → `extractFamilyInterviewMock(familyOnlyTranscript, profile, new Date(), language)`.
  4. Sanitize via the exported `sanitizeResult(result, profile, familyOnlyTranscript)`.
  5. `onInterviewExtracted(result, {extraction, source: "typed", rawText: familyOnlyTranscript}, {round: n})`.
  6. Advance: dedupe new follow-ups against already-asked questions (exact string); stop at `FAMILY_ORIENTATION_MAX_ROUNDS`, headroom exhaustion, or empty follow-ups → `complete` with the closing i18n line.
  - Guard with a `submittingRef` (double-submit) and a profile/language context-key ref (same invalidation pattern as `FamilyInterview`).
  - Focus: round 0 keeps the existing review-section focus (page test asserts it); later rounds focus the new question heading.

### i18n additions
`orientationRoundCount` ("Question {round} of {max}"), `followUpChipsLabel`, `followUpAnswerLabel`, `followUpAnswerPlaceholder`, `followUpAnswerSubmit`, `followUpAnswerError`, `orientationComplete`, `orientationStartOver` — en + es.

### Tests
- New `src/components/family-follow-up-turn.test.tsx`: chips render and submit with `via: "chip"`; free-text validation (empty rejected, short answer accepted); round-counter aria.
- New `src/components/family-orientation-interview.test.tsx`: chip tap-to-answer; typed short answer (<10 chars) accepted; **per-turn safety gate** (crisis text in an answer → `/chat?ask=`, `requestFamilyInterview` NOT called, `onSafetyEscalation` once); transcript serialization (live call receives the `Q:`/`A:` transcript, mock receives family-only text); round cap; question dedupe; live-null → mock follow-ups; headroom exhaustion ends the thread; double-submit guard.

Mock `requestFamilyInterview` and `next/navigation`'s `useRouter` the same way `family-interview.test.tsx` does; reuse the `morganFamilyState` fixture from `src/domain/family-fixtures.ts`.

**Commit:** `feat: add guided follow-up thread with answer chips`

---

## P4 — Page reorder

`src/components/family-experience.tsx`:
1. **Delete** the two entry anchor cards (lines 323–344).
2. Move the interview section **first** inside the profile gate (keep `id="family-interview-title"`), rendering `<FamilyOrientationInterview key={`family-orientation-${seedVersion}`} …>` instead of bare `<FamilyInterview>`.
3. `addInterview` gains a third arg `{round}`; set `pendingReviewFocusRef.current = round === 0`. Drop `followUps` from the `ReviewDetails` type (51–54).
4. **Delete** the "Questions to consider" block (404–415) — superseded by the interactive thread.
5. Below the review/resources stack, add the **demoted needs screen**: a disclosure button with `aria-expanded` / `aria-controls`, collapsed by default, labeled `needsScreenDisclosureTitle` ("Prefer simple questions?") with a `needsScreenDisclosureBody` line, conditionally rendering the **untouched** `<FamilyNeedsScreen>` (keeps `key={family-screen-${seedVersion}}`, `initialAnswers`, `onSubmit={submitScreen}`).
6. Leave resources / nearby recreation / saved / timeline sections alone — "resources appear after the first answer" falls out of `activeDomains` automatically.

i18n: add `needsScreenDisclosureTitle` / `needsScreenDisclosureBody`; **remove** `followUpsTitle`, `entryQuestionsTitle`, `entryQuestionsBody`, `entryInterviewTitle`, `entryInterviewBody` from the union and both blocks.

Update `src/app/family/page.test.tsx`:
- Drop the anchor-card assertions (~90–99, 107–114).
- Morgan flow: after the opening submit, assert the first follow-up question **and** chips are visible **and** resources are already matched (keep the existing Scott-County-first assertions).
- Tap a chip → a second `addFamilyInterview` fires with cumulative `rawText`; resources persist.
- After 2 rounds → completion message, no third question.
- Needs-screen interactions now expand the disclosure first; assert collapsed-by-default and `aria-expanded` toggling, then the full 8-question → "See support areas" → `activeDomains` path still works.
- Spanish test asserts an es follow-up question renders.
- Keep the existing safety-redirect test; add a mid-thread variant (crisis phrase in a follow-up answer → `/chat?ask=`, resources suppressed).
- The `michelle_p_waiver` card assertions (including the `/date ordered/i` match) must keep passing untouched.

`src/components/family-needs-screen.test.tsx` needs **no changes** — the component is untouched.

**Commit:** `feat: lead the family navigator with the orientation interview`

---

## P5 — Verification

1. `npm run check` — lint, all tests, build. **Note:** vitest on this machine occasionally dies with a transient tinypool `Worker exited unexpectedly` error that is not a test failure; retry once before diagnosing.
2. `npm run crisis:gate` — must stay PASS. This feature touches no safety modules, so a failure here means the per-turn gate wiring is wrong.
3. Browser walk-through. Start the dev server via the preview tooling (`.claude/launch.json` name `"dev"`, port 3000) — never via a raw shell command. **Pane screenshots currently time out on this machine**, so verify via DOM text (`read_page`, `get_page_text`, or `javascript_tool` reading `document.body.innerText` / `localStorage.getItem('home-health-ai-ownership-state')`). Walk:
   - Seed "Morgan and Riley — Scott County" → save profile → submit the opening description.
   - Assert: review facts + **first follow-up question with chips** + matched resources (Scott County first) all present simultaneously.
   - Tap a chip → second question appears, resources persist/refine, store shows 2 interviews.
   - Answer round 2 → completion message, no third question.
   - Type a crisis phrase into a follow-up answer → redirected to `/chat?ask=…`, review/resources suppressed, no extraction call.
   - Expand "Prefer simple questions?" → answer all 8 → "See support areas" still works.
   - Reseed Casey mid-thread → thread resets cleanly (seedVersion remount).
   - Repeat the opening in Spanish → an es follow-up question renders.

If anything in the walk-through fails, fix it and re-run `npm run check` before finishing.

**Commit:** `test: verify interview-led family navigator end to end` (only if verification required fixes)

---

## Guardrails

- **Never** weaken or reorder the safety gate. Every path that sends family text anywhere runs `classifyCrisis` / `classifySafety` / `screenSocialEmergency` **before** the network call, and escalates to `/chat?ask=` with resources suppressed.
- **Never** put organization, program, or resource names into LLM prompts or into follow-up questions/chips. The route test enforces this for the prompt; `sanitizeFamilyFollowUps` enforces it for model output; the mock invariant test enforces it for canned copy.
- **Never** let LLM output assert a diagnosis. All model text (facts, rationales, questions, chips) passes through the diagnosis lint.
- Keep en/es parity — the `Record` type will catch omissions at compile time.
- Don't touch `buildResourceMatches`, the catalog, the timeline, or `FamilyNeedsScreen`'s internals.
- TypeScript strict, no `any`. Match surrounding code style; don't add comments to code you didn't change.
