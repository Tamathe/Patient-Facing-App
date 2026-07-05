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
