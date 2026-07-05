## Task 7 Report: Today Screen and Priority Tasks

### Summary
- Implemented `buildTodayTasks` in `src/domain/tasks.ts` to generate today tasks from `AppState` and return up to three priority-ordered `TaskItem`s.
- Added `ActionCard` UI component and corresponding test.
- Replaced temporary Today content with a task action feed in `src/app/today/page.tsx`.

### Files changed
- `src/domain/tasks.ts` (new)
- `src/domain/tasks.test.ts` (new)
- `src/components/action-card.tsx` (new)
- `src/components/action-card.test.tsx` (new)
- `src/app/today/page.tsx` (modified)

### Test results (exact)
- `npm run test -- src/domain/tasks.test.ts src/components/action-card.test.tsx`
  - ✅ PASS: 2 files, 3 tests
- `npm run test`
  - ✅ PASS: 11 files, 45 tests

### Implementation notes
- Task generation:
  - Adds BP-first task when no readings exist.
  - Adds medicine-related follow-up depending on active barriers.
  - Adds visit prep task sourced from `state.carePlan.nextVisitReason`.
  - Sorts by `priority` and slices to `3`.
- Today page:
  - Uses `useHealthState()` from local store.
- Action cards:
  - Uses existing `lucide-react` `ArrowRight` icon and `TaskItem` type with required classes.

### Self-review
- Verified behavior against the Task 7 brief and kept surface limited to Today action feed only.
- Existing domain types and local fixture state (`demoState`) are unchanged.
- Kept imports aligned with existing `@/` alias and tailwind token usage.

### Concerns
- No functional blockers identified after verification.
- Initial targeted test failure was resolved by adding React imports in the component/test under this repo’s current test environment behavior.

## Fix pass: Task 7 review items

### Findings addressed
- Added escalation-aware Today task prioritization so readings that require clinical follow-up now surface first using `interpretBloodPressure` and `classifySafety`.
- Gated all medicine tasks behind `state.medications.length > 0` to avoid medicine tasks when no medicines are tracked.
- Skipped rendering the visit prep task body when `state.carePlan.nextVisitReason` is blank/whitespace.

### Files changed
- `src/domain/tasks.ts`
- `src/domain/tasks.test.ts`

### Verification
- `npm run test -- src/domain/tasks.test.ts src/domain/blood-pressure.test.ts src/domain/safety.test.ts src/components/action-card.test.tsx`
  - PASS: 4 test files, 16 tests.
- `npm run test`
  - PASS: 11 test files, 48 tests.

### Self-review
- The escalation path is deterministic and gives the clinic follow-up task priority over routine tasks when the latest reading is risky.
- Medicine and visit task generation now fail safe for empty data shapes without introducing app-shell or navigation changes.
- Non-diagnostic wording stays patient-directed in all newly added task copy.

## Follow-up Fix: Re-review actions

### Findings addressed
- Added a required `TaskItem.status` field with typed values `"confirmed" | "inferred" | "needs_review"` so every Today task exposes a patient-facing evidence status.
- Updated `ActionCard` to render that status in plain language under each card body.
- Updated urgent blood pressure tasks to surface different copy when thresholds are clinician-authored (`clinician_authored`) versus standard-education (`standard_education`) guidance:
  - Clinician-authored: "clinician-authored care plan" messaging + `status: "confirmed"`.
  - Standard education: standard education threshold wording + `status: "inferred"`.

### Verification
- `npm run test -- src/domain/tasks.test.ts src/components/action-card.test.tsx src/domain/blood-pressure.test.ts`
  - PASS: 3 files, 11 tests.
- `npm run test`
  - PASS: 11 files, 50 tests.
- `npm run build`
  - PASS: production build completes with static page generation.

## Follow-up Fix: Task 7 client-boundary review

### Files changed
- `src/components/app-shell.tsx`

### Fix
- Added `"use client"` to `AppShell` so it is explicitly client-safe and can be imported by client pages (including `/today`) without component boundary warnings.

### Verification
- `npm run test -- src/components/app-shell.test.tsx src/domain/tasks.test.ts src/components/action-card.test.tsx`
  - PASS: `3` files, `10` tests.
- `npm run build`
  - PASS: production build succeeds (`Next.js 15.5.20`, all static routes generated).

### Files updated
- `src/domain/types.ts`
- `src/domain/tasks.ts`
- `src/domain/tasks.test.ts`
- `src/components/action-card.tsx`
- `src/components/action-card.test.tsx`

## Follow-up Fix: Task 7 storage validator review

### Files changed
- `src/state/storage.ts`
- `src/state/storage.test.ts`

### Fix
- Added `isTaskStatus` to require `TaskItem.status` to be exactly `"confirmed" | "inferred" | "needs_review"` and wired it into `isTask` validation.
- Added `storage.test.ts` regression test: persists a task without `status`, expects fallback to `demoState`, and expects localStorage entry to be removed.

### Verification
- `npm run test -- src/state/storage.test.ts src/domain/tasks.test.ts src/components/action-card.test.tsx`
  - PASS: 3 files, 21 tests.
- `npm run build`
  - PASS: production build completes (`Next.js 15.5.20`, all static routes generated).

## Follow-up Fix: Task 7 storage recovery handling

### Files changed
- `src/state/storage.ts`
- `src/state/storage.test.ts`

### Fix
- Kept strict fallback behavior for malformed core health data and entity relationships (`patient`, `carePlan`, `medications`, `readings`, `contextItems`, `extractedFacts`, `aiMessages`, `auditEvents`).
- Sanitized only the `tasks` array during load by dropping invalid/stale task entries (for example, entries missing `status`) while preserving the rest of the saved state.
- When sanitized state passes core validation, returned the sanitized state and persisted it back to `localStorage`.

### Verification
- `npm run test -- src/state/storage.test.ts src/domain/tasks.test.ts src/components/action-card.test.tsx`
  - PASS: 3 files, 21 tests.
- `npm run build`
  - PASS: production build completes with static route generation (`Next.js 15.5.20`).

## Fix: Task 7 recent-reading window and Today fallback

### Files changed
- `src/domain/tasks.ts`
- `src/domain/tasks.test.ts`

### Fix notes
- Clinical follow-up now uses the most recent reading within a 24-hour window that requires follow-up (care-plan threshold or safety escalation), instead of only the latest reading.
- Added a safe fallback Today task so an empty action list is never rendered in low-activity states.
- Clinician-authored care-plan thresholds still map to `status: "confirmed"` with clinician threshold copy; non-clinician threshold copy/status remains unchanged.

### Verification
- `npm run test -- src/domain/tasks.test.ts src/domain/blood-pressure.test.ts src/domain/safety.test.ts src/components/action-card.test.tsx`
  - PASS: 4 files, 21 tests.
- `npm run build`
  - PASS: production build completes (`Next.js 15.5.20`) with all routes generated.

## Fix: Task 7 safety consistency review

### Findings addressed
- Added shared recent-clinical reading lookup logic in `src/domain/recent-clinical-reading.ts` so Today and chat both use the same recent-reading safety window.
- Switched recent-reading window anchoring to the latest logged reading timestamp instead of wall-clock time.
- Updated Today task copy to emit a distinct urgent-help task with classifySafety language when an earlier recent reading reports urgent symptoms (for example, chest pain).
- Updated safety-gate escalation to scan the same recent-reading window so earlier dangerous/urgent readings still block provider responses even if the latest reading is normal.

### Files changed
- `src/domain/recent-clinical-reading.ts`
- `src/domain/tasks.ts`
- `src/domain/tasks.test.ts`
- `src/ai/safety-gate.ts`
- `src/ai/safety-gate.test.ts`

### Verification
- `npm run test -- src/domain/tasks.test.ts src/domain/safety.test.ts src/domain/blood-pressure.test.ts src/ai/safety-gate.test.ts src/components/action-card.test.tsx`
  - PASS: 5 files, 29 tests.
- `npm run build`
  - PASS: production build completes (`Next.js 15.5.20`) with all routes generated.

### Notes
- Changes are limited to Task 7 safety/tasking code paths and existing behavior for blocked/provider-call sequencing remains intact.

## Fix: Task 7 blocked note windowed safety regression

### Fix notes
- Updated `src/domain/recent-clinical-reading.ts` to support optionally including `noteSafety.level === "blocked"` in recent-reading candidate selection.
- Added optional `includeBlockedNotes` flag to `findRecentClinicalReading` and defaulted it to `false` so existing Today-task callers keep prior behavior.
- Updated `src/ai/safety-gate.ts` to include blocked recent-reading candidates and return `blocked` before provider execution when those appear.
- Added a regression test in `src/ai/safety-gate.test.ts` for a blocked in-window note followed by a normal later reading where provider calls should be blocked.

### Files changed
- `src/domain/recent-clinical-reading.ts`
- `src/ai/safety-gate.ts`
- `src/ai/safety-gate.test.ts`

### Verification
- `npm run test -- src/ai/safety-gate.test.ts src/domain/tasks.test.ts src/domain/safety.test.ts src/components/action-card.test.tsx`
  - PASS: 4 files, 27 tests.
- `npm run build`
  - PASS: production build completes (`Next.js 15.5.20`) with all routes generated.

## Fix: Task 7 severity-first recent-reading selection and blocked-note Today task

### Findings addressed
- Updated `findRecentClinicalReading` in `src/domain/recent-clinical-reading.ts` to rank candidates by severity before recency (`urgent` / clinic escalation beats `blocked` notes; recency only breaks ties within the same severity).
- Updated `buildTodayTasks` in `src/domain/tasks.ts` to include blocked-note readings via `findRecentClinicalReading(..., { includeBlockedNotes: true })`, while preserving urgent-symptom copy and clinician-authored versus standard-threshold distinctions.
- Added a dedicated blocked-note Today task (`status: "needs_review"`, `/chat`) when blocked-note-only is the highest-severity in-window reading.

### Files changed
- `src/domain/recent-clinical-reading.ts`
- `src/domain/tasks.ts`
- `src/domain/tasks.test.ts`
- `src/ai/safety-gate.test.ts`

### Verification
- `npm run test -- src/domain/tasks.test.ts src/ai/safety-gate.test.ts src/domain/safety.test.ts src/components/action-card.test.tsx`
  - PASS: 4 files, 30 tests.
- `npm run build`
  - PASS: Next.js production build completed (`Next.js 15.5.20`) with all routes generated.

## Fix: Task 7 stale-reading interpretation fix

### Files changed
- `src/domain/recent-clinical-reading.ts`
- `src/domain/tasks.test.ts`

### Fix notes
- Passed only recent-window readings to `interpretBloodPressure`, in ascending (chronological) order, from `findRecentClinicalReading`.
- Kept severity-first selection behavior intact (`urgent` stays above `blocked`).
- Added regression coverage for outdated high readings not changing Today handling of normal readings and for blocked-note behavior with stale highs present.

### Verification (exact)
- `npm run test -- src/domain/tasks.test.ts src/domain/blood-pressure.test.ts src/ai/safety-gate.test.ts src/components/action-card.test.tsx`
  - PASS: 4 files, 28 tests.
- `npm run build`
  - PASS: production build succeeds (`Next.js 15.5.20`) with all routes generated.
