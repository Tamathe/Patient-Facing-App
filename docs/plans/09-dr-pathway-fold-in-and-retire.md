# DR Pathway Fold-In & rhtp-prototype Retirement — One App

**Paste-ready end-to-end handoff. Execute P0→P8 in order, no per-phase stops. All build work lands in `C:\Patient centered` (Next.js 15 / React 19 / TS strict / Tailwind 3 / useReducer+localStorage / vitest 2 / Playwright, Windows, npm). Solo repo, direct path-scoped commits to `master`, NO push of this repo, no PRs. `rhtp-prototype/` is read-only scavenge material until P8, where it is archived to its own remote and then DELETED.**

## Mission

Decision (user, 2026-07-07): **the patient-facing app IS the app.** `rhtp-prototype` (nested, own git repo, remote `Tamathe/RHTP`, gitignored by this repo at `.gitignore:18`) was the exploration ground; sprint 08 already ported its safety spine (crisis red-flags, grounding, voice safety, PDC, SDOH, accessibility, PhoneFrame). This sprint finishes the job: port the diabetic-retinopathy screening pathway into the base app as first-class product surface, record the unported concepts as an ideas document, then retire the prototype for good.

The pathway to build (from the UK × Microsoft × Kentucky RHTP meetings): FDA-cleared cameras already produce a DR grade in ten minutes — **detection is solved; navigation is the product.** The app must carry a diabetic patient from *"you're due"* → find & book the soonest nearby screening → photograph the printed result → auto-place a correctly-urgent referral → chase it until seen → turn the result into daily diabetes motivation. Kentucky: 500K+ diabetics, ~12–15 retina specialists — risk stratification is everything.

## Context — the base app today (verified 2026-07-07)

- **State**: `AppState` at `src/domain/types.ts:245` (patient, carePlan, medications, readings, glucoseReadings, tasks, contextItems, extractedFacts, aiMessages, auditEvents, mealLog, doseEvents, medicationFills, assessmentEvents). `Condition = "hypertension" | "diabetes" | "obesity"` (types.ts:30); profile carries `conditions?`. Persistence: `src/state/storage.ts` — `loadStoredState` validates strictly and **hard-resets to demo state on unknown shapes**.
- **ATOMIC TYPE+GUARD RULE (house tripwire, from plan 08):** any change to `AppState` shape or the `AuditEvent.action` union MUST land in the same commit as the matching `storage.ts` guard/sanitizer/missing-array-shim edits plus a pre-feature-payload regression test (mirror the existing shim idiom in `loadStoredState`).
- **Routing**: pages `/` (home), `/today`, `/chat`, `/menu`, `/glucose`, `/food`, `/plan`, `/medicines`, `/numbers`, `/checkin`, `/support`, `/visits`, `/intake`, `/onboarding`, `/privacy`, `/demo`. Safety-first front door: `src/domain/front-door.ts` (deterministic router; crisis can NEVER route to a feature screen; route labels kept in lockstep with the menu catalog by `front-door.test.ts`) + `src/domain/route-classifier.ts` (`CLASSIFIER_HREFS`) + constrained live classifier client.
- **i18n**: `src/i18n/strings.ts` — `Language = "en" | "es"`, per-feature `Record<Language, Record<Key, string>>` catalogs + parity tests. **All new patient-facing strings ship en + es, equal urgency in es.**
- **Safety/AI**: `src/ai/safety-gate.ts`, `src/domain/crisis-red-flags.ts` (+ corpus + `crisis:gate` script), `src/domain/grounding.ts` + `src/ai/grounding-facts.ts`, mock-first providers (`mock-provider`, `vision-provider`, `coach-provider` behind env flag), `src/domain/audit.ts`.
- **Reusable machinery relevant here**: `tasks.ts`/`task-prefill.ts` (Today feed), `condition-lens.ts`, `featured-medication.ts`, `blood-glucose.ts`, `sdoh-resources.ts` + `resource-referral.tsx` (transportation help!), `care-team-message.ts` (drafted messages to the care team), `health-brief.ts`, `accessibility.ts`, `phone-frame.tsx` + `/demo`.
- **Verification**: `npm run check` (lint+test+build), `npm run test:e2e` (Playwright), `npm run crisis:gate`. **Mock-first invariant: everything passes with zero env vars.**

## Context — what's in rhtp-prototype (scavenge source, read-only until P8)

- Pure, tested libs: `src/lib/screening-gap.ts` (gap lifecycle `overdue→engaged→scheduled→completed→closed|referral|repeat`, `outcomeToStatus`), `src/lib/retinopathy-protocol.ts` (protocol state machine incl. `result_imported → normal_closed|abnormal_referral_needed|repeat_needed`), `src/lib/site-matching.ts` + `src/lib/ky-geo.ts` (zip→distance, best/fastest/closest ranking, equity nudge), `src/lib/coverage-logistics.ts` (`bestCoverageOptionForSite`), `server/sms-disclosure.ts` (approved-template rendering + prohibited-term lint, en/es).
- Seed catalog: ~14 Kentucky screening sites (FQHC/mobile/Kroger/pharmacy/eye-clinic) in `src/data/seed.ts`; hero Ruth Ann Caldwell, Hazard 41701.
- **Uncommitted working-tree changes** (the newest DR-finder iteration): `src/components/phone/FindScreeningScreen.tsx`, `PlanBuilderScreen`/`ResultScreen` + tests, `PhoneApp.tsx`. Scavenge their logic/UX as reference; they get archived (not lost) in P8's archival commit.
- **Unpushed commits on master** (≥5 ahead of `origin/master` as of 2026-07-07). P8 must archive-push before any deletion.

## Scope decisions (locked)

1. **One app.** Everything lands in base-app architecture: useReducer store + validated localStorage, i18n catalogs en+es, safety-gate front door, base design tokens (ink/paper/care/pulse/calm/note, `rounded-control`, min-h-12 targets). rhtp visual style is NOT imported; its screens are logic/UX reference only.
2. **Patient-owned, single-patient.** No staff hub, no multi-patient views (sprint-08 precedent). Navigator/CHW presence is represented from the patient's side: escalations become visible status + a drafted care-team message (`care-team-message.ts` pattern). Hub concepts go in the ideas doc.
3. **Deterministic-first.** Photo extraction defaults to bundled demo fixtures + typed entry; a live vision route is env-gated following the existing `vision-provider.ts` pattern. `npm run check` stays green with zero env vars.
4. The clinical triage table below is **LOCKED** — tests assert it verbatim; do not "improve" it.
5. Retirement is **guarded**: archive-commit + push rhtp-prototype to its own remote and verify sync BEFORE deleting. Any guard failure → stop and report; never delete unarchived work.

## Non-goals (do not build)

- No staff/navigator hub, no multi-patient state, no real SMS sending, no EHR/FHIR/fax integration, no PDF generation (packet = printable view), no auth changes.
- No new npm dependencies. No zustand (rhtp idiom — translate to the reducer/store pattern).
- **No interpretation of retinal photographs, ever.** No re-grading or second-guessing the camera report.
- Do not edit historical docs (`docs/plans/00–08`, `docs/specs/*`) beyond adding forward pointers; do not touch `src/domain/adherence.ts` (uplift B owns it) or redesign the nav (append new entries at the END of existing lists/catalogs).

## THE CLINICAL LINE (hard guardrail, every phase)

- The FDA-cleared camera's **printed report** is the only source of a DR grade. The app reads reports; it never reads eyes.
- Every extraction requires **explicit human confirmation** before any state change.
- Unparseable input → **refuse**, with a distinct refusal when the image appears to be a retinal photograph ("I can only read the printed report, not eye photos"). Unknown → refuse; never guess.
- Grounding-safe phrasing everywhere: "**Your report says…**", never "You have…". Urgent copy is calm ("needs care soon"), never alarming. Both languages carry equal urgency.
- Crisis precedence is untouched: front-door crisis routing outranks every screening route; typed free-text runs through the existing safety gate before any parsing.

## Hard guardrails (every phase)

- Path-scoped `git add <paths>` only, never `git add .`/`-A`. One commit per phase, message format given. NO push of this repo (P8 pushes ONLY `rhtp-prototype` to its own `Tamathe/RHTP` remote as archival).
- Until P8: treat `rhtp-prototype/` as read-only reference. Never `git add rhtp-prototype`, never import from it — **copy and adapt** (sprint-08 rule). Ported modules bring their vitest suites along, adapted to vitest 2 idioms, in the same phase.
- Atomic type+guard rule (above) for every `AppState`/`AuditEvent.action` change.
- All new patient-facing strings: en + es catalogs + parity-test coverage.
- Every new domain lib gets a vitest suite; every new page/component an RTL test; TS strict, no `any`, `const` over `let`, no comments on unchanged code.
- After every phase: `npm run check` green. `crisis:gate` green whenever safety-adjacent files change. If something is red for an out-of-scope reason: stop and report.

## Cross-cutting contract (P0 establishes; everything compiles against it)

Additions to `src/domain/types.ts` (exact):

```ts
export type DrGrade = "no_dr" | "mild_npdr" | "moderate_npdr" | "severe_npdr" | "pdr";
export type ReferralTier = "none" | "optometry_routine" | "retina_urgent";
export type ReferralStage = "drafted" | "sent" | "clinic_confirmed" | "scheduled" | "completed" | "stalled";
export type ScreeningGapStatus = "overdue" | "engaged" | "scheduled" | "completed" | "closed" | "referral" | "repeat";
export type ScreeningOutcome = "normal" | "abnormal" | "ungradable";
export type ResultCaptureSource = "photo_report" | "typed_entry";
export type ExtractionRefusal = "not_a_report" | "retinal_photograph" | "unreadable";

export type ScreeningVenueType = "fqhc" | "mobile_clinic" | "community_camera" | "eye_clinic" | "kroger" | "pharmacy" | "primary_care";

export type ScreeningSite = {
  id: string; name: string; type: ScreeningVenueType; zip: string; city: string;
  lat: number; lng: number; nextAvailable: string; nextAvailableHours: number;
  rideSupport: boolean; lowCost: boolean;
};

export type ReferralDestination = {
  id: string; name: string; kind: "optometry" | "retina"; city: string; distanceMiles: number;
  phone: string; nextSlots: string[]; coverageNote: string;
};

export type DrReportExtraction = {
  grade: DrGrade | null; dmePresent: boolean | null; ungradable: boolean;
  confidence: "high" | "medium" | "low"; fieldsRead: string[]; refusal?: ExtractionRefusal;
};

export type ScreeningGap = {
  id: string; condition: "diabetes"; status: ScreeningGapStatus;
  lastScreeningDate: string | null; scheduledSiteId?: string; scheduledFor?: string;
};

export type ScreeningResult = {
  id: string; gapId: string; outcome: ScreeningOutcome; grade: DrGrade | null;
  dmePresent: boolean | null; source: ResultCaptureSource; reportRef: string;
  confirmedAt: string;
};

export type ReferralStageEntry = { stage: ReferralStage; at: string; note: string };

export type Referral = {
  id: string; resultId: string; tier: ReferralTier; destinationId: string;
  stageHistory: ReferralStageEntry[]; sentAt: string; scheduledFor?: string;
};

export type RecallReminder = {
  id: string; dueAt: string; reason: "annual_rescreen" | "annual_rescreen_mild";
};
```

`AppState` additions (same commit as storage guards/shims + regression test): `screeningGaps: ScreeningGap[]`, `screeningResults: ScreeningResult[]`, `referrals: Referral[]`, `recallReminders: RecallReminder[]`.

`AuditEvent.action` union additions (same atomic rule; add as each phase first uses them): `"screening_scheduled"`, `"screening_result_confirmed"`, `"referral_placed"`, `"referral_escalated"`, `"referral_booked"`, `"recall_scheduled"`.

**Triage table (LOCKED — Dr. Carvalho's referral rules, encoded in `src/domain/dr-triage.ts`):**

| Report | Outcome | Tier | Recall |
|---|---|---|---|
| ungradable | `ungradable` | `none` | rebook now (`repeat` flow) |
| `no_dr` | `normal` | `none` | 12 months |
| `mild_npdr` | `normal` | `none` | 12 months + chronic-care emphasis |
| `moderate_npdr` / `severe_npdr`, no DME | `abnormal` | `optometry_routine` | specialist-managed |
| any DME, or `pdr` | `abnormal` | `retina_urgent` | specialist-managed |

**Escalation thresholds (LOCKED):** referral with no `clinic_confirmed` stage after **2 days** (`retina_urgent`) / **5 days** (`optometry_routine`) → append `stalled` + draft a care-team message + audit `referral_escalated`. Fires once per referral (idempotent). Elapsed time = real clock vs `sentAt`; the demo control backdates `sentAt` (never a fake clock).

**Plain-language grade copy (LOCKED, grounding-safe; single i18n catalog `screeningStrings`, en + es):**
- `no_dr`: "Your report says no signs of diabetic eye disease were found."
- `mild_npdr`: "Your report shows mild early changes. No specialist visit is needed now — a repeat photo in 12 months keeps watch."
- `moderate_npdr`/`severe_npdr`: "Your report shows changes that need a closer look by an eye doctor. This is common and treatable when caught early."
- DME/`pdr`: "Your report shows changes that need care soon. Getting seen quickly protects your vision. Your referral has already been sent."
- ungradable: "The image could not be read clearly, which happens sometimes. A quick repeat screening is all that is needed."

**Port map (copy-and-adapt, with their tests):**

| rhtp-prototype source | Destination | Adaptation |
|---|---|---|
| `src/lib/screening-gap.ts` + test | `src/domain/screening-gap.ts` | Keep `LEGAL_TRANSITIONS`/`canTransition`/`transition`/`outcomeToStatus` API; retype to contract above |
| `src/lib/retinopathy-protocol.ts` + test | `src/domain/retinopathy-protocol.ts` | Keep `nextProtocolStatus` machine; trim event/status unions to what the base app emits |
| `src/lib/ky-geo.ts` + `src/lib/site-matching.ts` + tests + seed sites | `src/domain/ky-geo.ts` + `src/domain/screening-sites.ts` | Merge the ~14-site catalog as a typed fixture; keep `withDistances`/`isKnownZip`/`rankSites`/`explainMatch` |
| `src/lib/coverage-logistics.ts` + test | `src/domain/coverage-logistics.ts` | Keep `bestCoverageOptionForSite`; seed coverage options per site |
| `server/sms-disclosure.ts` (concepts) | `src/domain/nudge-template.ts` + `screeningStrings` | Approved-template render + prohibited-term lint as tests; en + es |
| Uncommitted phone screens (Find/Plan/Result + PhoneApp diff) | `/screening` pages/components (P1–P3) | Logic/UX reference only; rebuild with base tokens + i18n |
| Everything else | `docs/rhtp-scavenge-notes.md` (P7) | Ideas only — not ported |

---

## P0 — Contract, ported state machines, storage spine

**Build:**
- Commit this plan file (`docs/plans/09-dr-pathway-fold-in-and-retire.md`).
- `src/domain/types.ts`: full contract above; `AppState` + four arrays.
- `src/state/storage.ts` **same commit**: validators for the four new record types, missing-array shims in `loadStoredState`, and a regression test proving a pre-DR stored payload still loads (house tripwire).
- Port `screening-gap.ts`, `retinopathy-protocol.ts` per port map, with adapted tests.
- `src/domain/dr-triage.ts` + test: `outcomeForGrade`, `tierForResult`, `recallMonthsFor`, `escalationThresholdDays`, `expectCallWithinDays`, `recallDateFrom(confirmedAt)`. Tests assert the locked table row by row; DME beats grade.
- `src/i18n/strings.ts`: `screeningStrings` catalog (locked grade copy + this sprint's shared labels), en + es, wired into the catalog parity test.
- `src/domain/fixtures.ts`: demo state gains a diabetes screening gap (`status: "overdue"`, `lastScreeningDate` ~19 months back) so every surface has something to render.
- Store: reducer actions land per-phase; P0 adds only the state arrays + hydration.

**Commit:** `feat: DR screening contract, ported gap/protocol machines, storage spine (DR P0)`

## P1 — Find & book (+ the nudge front door)

**Build:**
- Port `ky-geo.ts`, `screening-sites.ts` (site catalog + `ReferralDestination` fixtures: Hazard Optometry Associates 2 mi / Whitesburg Family Eye Care 24 mi / UK Retina — Lexington 112 mi / Louisville Regional Eye Institute — Retina Service 178 mi; retina slots sooner than optometry), `coverage-logistics.ts`, with tests.
- New route `src/app/screening/page.tsx` + components: zip entry (prefilled from profile if present) → **one recommendation first** ("Tuesday 2:40 PM at {site}, {mi} mi — Book it") with "see other options" expanding the ranked list (best/fastest/closest modes, equity nudge when the eye clinic is farther than a camera venue). Booking dispatches: gap → `scheduled`, a `TaskItem` in the Today feed ("Eye screening — {site}, {when}"), audit `screening_scheduled`, and a transportation ask ("Do you have a way to get there?" → `rideSupport` note or `sdoh-resources` transportation referral via the existing `resource-referral` pattern).
- Nudge entry: `/screening?entry=sms` renders the SMS-style landing first — carrier-style bubble built from `nudge-template.ts` ("Hi {firstName} — it's been {months} months since your last diabetes eye check…"), giant "See times near me" button, "I'd rather talk to someone" secondary → drafts a care-team callback message (`care-team-message.ts`) instead of a fake queue. Template passes the prohibited-term lint test, en + es.
- Wire the front door: add `/screening` to the menu catalog, `FrontDoorRoute`/labels, `CLASSIFIER_HREFS`, and the lockstep tests; append at the END of existing lists. Home: an "Eye check due" tile appears when a diabetes condition + overdue gap exist (follow the `condition-lens`/home-tile idiom from the glucose tile).
- What-to-expect card on the booked state: "About 10 minutes. Usually no dilation. No air puff. You'll know before you leave." (en+es; kills the fear-driven no-show).

**Commit:** `feat: screening find-and-book with SMS nudge front door (DR P1)`

## P2 — Snap the report (capture → extract → confirm → import)

**Build:**
- `public/demo-reports/` (or `src/assets` per repo convention): 4 self-authored SVG "camera report sheets", watermarked "DEMO — NOT A MEDICAL DOCUMENT": `report-no-dr.svg`, `report-moderate-npdr.svg`, `report-pdr-dme.svg`, `report-ungradable.svg`.
- `src/domain/dr-report-extract.ts` + test — deterministic extractor: photo input recognized by fixture filename stem → exact `DrReportExtraction` (`confidence: "high"`, `fieldsRead` listing lines "read"); any other filename → `refusal: "unreadable"`; names matching `fundus|retina|eye-photo` → `refusal: "retinal_photograph"`. Typed input: strict vocabulary parse (`no dr|none|mild|moderate|severe|pdr|proliferative`, `dme|macular edema|swelling`, `ungradable`); unparseable → refusal. Typed free-text runs through the existing safety gate FIRST; crisis text takes the crisis path, never extraction. **Never guess.**
- `/screening/result` capture flow (new page/screen states): *Intro* (what to photograph + boundary card: "I read the printed report only — I can't check your eyes or give a diagnosis") → *Input* (file input `accept="image/*"`, "Type it instead", demo picker listing the four bundled reports) → *Review* ("Here's what I read from your report:" grade in plain language + DME line + fields read; **"That's right"** / **"That's not right"** → back to input with typed entry preselected — human correction IS the path) → *Refusal* states with refusal-specific copy.
- Confirm dispatches `screeningResultConfirmed`: creates `ScreeningResult`, derives outcome via `dr-triage`, transitions the gap via ported `outcomeToStatus`/machines, audit `screening_result_confirmed`, provenance line rendered on the result view ("From your report photo — confirmed by you", grounding-facts pattern).
- **Optional live path (env-gated, additive):** `src/app/api/screening/extract/route.ts` mirroring the existing `vision-provider.ts` provider + env pattern; the page uses it only when its flag is set; prompt hard-instructs the refusal taxonomy (retinal photograph → refuse). Zero-env `check` unaffected; no key ever reaches the client.

**Commit:** `feat: photo-of-report capture with confirmed extraction import (DR P2)`

## P3 — Auto-referral, packet, patient-visible status

**Build:**
- On abnormal confirm, the same dispatch places the referral: `tier = tierForResult(...)`, destination = nearest `ReferralDestination` of the required kind, `stageHistory: [drafted, sent]` with plain notes, audit `referral_placed`.
- `ReferralStatusCard` on the result view: "Your referral went to **{name}** ({Optometrist|Retina specialist}), {mi} mi — expect a call within **{2|5} days**." Stage timeline (drafted → sent → confirmed → scheduled → done), current stage highlighted; `stalled` renders "We're on it — your care team has been notified."
- `ReferralPacketView` (printable view): patient name, grade plain language, urgency tier, destination, screening site + date, "DEMO PACKET" watermark, and a "A real referral would also include: insurance card copy, PCP signature, image files" footnote.
- `retina_urgent` additionally surfaces an urgent-styled banner (calm copy) and immediately drafts the care-team message.
- Result view branches for normal/mild/ungradable use the locked copy; all en + es.

**Commit:** `feat: tiered auto-referral with packet and patient-visible status (DR P3)`

## P4 — Follow-through: silence escalation, recall, rebook

**Build:**
- `src/domain/referral-followup.ts` + test: `escalationDue(referral, now)` from `sentAt` + threshold; store action `checkReferralFollowup` (invoked on app load + result-view mount) appends `stalled` once (idempotent), drafts the care-team escalation message, audit `referral_escalated`.
- Demo control (dev/demo affordance, consistent with existing demo idioms): "Simulate {2|5} days passing" button on the referral card that backdates `sentAt` — never a fake clock.
- `markClinicConfirmed` action (patient taps "They called me — it's confirmed") → `clinic_confirmed` stage; honest timeline (a stalled-then-confirmed history stays visible).
- Recall: normal/mild confirm creates `RecallReminder` (`dueAt = recallDateFrom(confirmedAt)`, 12 months; mild reason adds the chronic-care emphasis line). Surfaces: result view ("We'll remind you in {month year}") and a quiet Today-feed entry when due within 60 days (tasks.ts integration).
- Ungradable: result view "Rebook now" → `/screening` find flow (`repeat → scheduled` is already legal in the ported machine).
- Tests: threshold boundaries (day 2 vs 3, 5 vs 6), idempotency, recall math, mild-vs-normal reason, rebook path.

**Commit:** `feat: referral silence escalation, annual recall, ungradable rebook (DR P4)`

## P5 — In-network slot booking

**Build:**
- `SlotPickerCard` inside `ReferralStatusCard` when the destination has `nextSlots` and stage < `scheduled`: "Or pick a time now:" → 3 slots, **soonest first**, "Tue Jul 14 · 9:20 AM".
- `bookReferralSlot` action: appends `scheduled` stage (note "Booked {when} at {name}"), sets `scheduledFor`, audit `referral_booked`, shows `coverageNote` + ride re-ask ("Need a ride that day?" → sdoh transportation referral).
- "It happened" closure: "I went to this appointment" → `completed` stage (self-reported; source honesty per the house evidence-status idiom).
- Out-of-network/no-slot destinations keep the P3 "expect a call" path untouched.

**Commit:** `feat: in-network referral slot booking with coverage note (DR P5)`

## P6 — Teachable moment + coach grounding + condition lens

**Build:**
- `TeachableMomentCard` on every result branch: locked grade copy + fixed bridge line "The same blood sugar that affects your eyes responds to daily care. Small steps protect your sight." CTAs into what already exists: **My Blood Sugar** (`/glucose`), **Check a food** (`/food`), **My medicines** (`/medicines`). en + es.
- Coach grounding: the confirmed result becomes a grounding fact (`grounding-facts.ts` adapter) so the coach can answer "what did my eye report say?" strictly from the report ("Your report from {date} says…"); safety-gate and grounding verifier behavior unchanged — extend their fixtures with screening facts.
- Condition lens: diabetes lens (`condition-lens.ts`) reflects screening state (due / booked / referred / all-clear until {recall date}) on home + `/plan`.
- Closed-loop status: `/visits` (or `/plan`, whichever fits the existing information architecture better — pick one, note in commit body) shows the referral journey summary: screened {date} → referral sent → scheduled {date} → completed.

**Commit:** `feat: teachable-moment bridge, coach grounding, condition-lens integration (DR P6)`

## P7 — Scavenge notes, demo flow, e2e

**Build:**
- `docs/rhtp-scavenge-notes.md` — the "ideas" half of the scavenge. For each unported concept, 2–3 lines (what it was, why it mattered, where it lived) + pointer to the archive (`github.com/Tamathe/RHTP@<final sha>` — fill the sha in P8): navigator hub views (gap list / navigator queue / referral queue / program outcomes / expansion map), equity metrics + small-cell suppression, billing evidence (CCM/RPM/APCM/CHW), grant reporting packets, navigator enrollment + identity proofing, Part 2/break-glass/async access tokens, protocol-pack generalization (multi-condition screening), clinician writeback rail, ops gate + release-packet discipline, longitudinal health/health alerts, voice red-team drills, SMS campaign machinery. Close with "candidate next sprints" (program/hub surface; multi-condition packs).
- `/demo` phone-frame flow: ensure the golden path is demoable — start at `/screening?entry=sms`, walk nudge → book → snap (demo picker, default `report-moderate-npdr.svg`) → referral → simulate silence → book slot → teachable moment. Adjust `/demo` wiring only as needed.
- Playwright e2e: one golden-path spec covering exactly that journey (deterministic fixtures; zero env).
- README: update run/demo instructions; remove forward-looking references to `rhtp-prototype` (leave historical docs untouched).

**Commit:** `feat: scavenge notes, demo golden path, e2e coverage (DR P7)`

## P8 — Retirement (GUARDED — the only destructive phase)

**Preconditions (all must hold; otherwise STOP and report, delete nothing):**
1. P0–P7 committed; `npm run check` + `npm run test:e2e` + `npm run crisis:gate` all green.
2. `rhtp-prototype` archival: inside `rhtp-prototype/` run `git add -A && git commit -m "chore: archive working tree before retirement (folded into Patient-Facing-App)"` (this is the one place `-A` is correct — it's an archive snapshot, including the uncommitted DR-finder work).
3. `git -C rhtp-prototype push origin master` (its own remote, `Tamathe/RHTP`). Verify `git -C rhtp-prototype log origin/master..master` is EMPTY and `git -C rhtp-prototype status --porcelain` is EMPTY. Record the final sha.

**Then:**
- Fill the final sha into `docs/rhtp-scavenge-notes.md`.
- Delete the directory: `Remove-Item -Recurse -Force "C:\Patient centered\rhtp-prototype"`.
- Scrub forward-looking references: remove `.gitignore:18` (`rhtp-prototype/`); check `.claude/launch.json` for rhtp server entries and remove them; grep the repo for `rhtp-prototype` and update anything non-historical (README done in P7; `docs/plans/08-*` and this file stay as history).
- Final verification: `npm run check` green from a clean state.

**Commit:** `chore: retire rhtp-prototype (archived at Tamathe/RHTP@<sha>), scrub references (DR P8)`

**STOP — do not push this repo.** Report: phases landed, verification output, the archive sha, and the demo steps.

---

## Acceptance demo (must be clickable at the end)

1. Open `/screening?entry=sms` (or via `/demo`): the text — "Hi {name} — it's been 19 months since your last diabetes eye check…" → **See times near me**.
2. One recommendation ("mobile FQHC camera, 2 mi, Tuesday") → Book → ride question → Today feed shows the appointment; home tile updates.
3. Snap screen → demo picker → `report-moderate-npdr.svg` → "Here's what I read… That's right."
4. Result: "a closer look is recommended" + referral **already sent** to Hazard Optometry Associates, "expect a call within 5 days", packet viewable.
5. "Simulate 5 days passing" → status becomes "We're on it — your care team has been notified" + drafted care-team message visible.
6. Pick a slot instead → booked, coverage note + ride chip.
7. Teachable moment → tap into `/glucose` and `/food`.
8. Reset; rerun with `report-pdr-dme.svg` (urgent tier: 2-day threshold, retina destination, urgent banner) and `report-no-dr.svg` (recall "July 2027", quiet Today entry).
9. Ask the coach "what did my eye report say?" → grounded answer quoting the report date and grade.

## If something conflicts

The base app's storage validation, front-door crisis precedence, i18n parity tests, and grounding verifier are load-bearing. When a phase instruction collides with how they actually work, keep the base app's behavior, adapt the ported code, and note the deviation in the commit body. Never weaken `loadStoredState` validation, never let a screening route preempt crisis routing, and never let extraction guess.
