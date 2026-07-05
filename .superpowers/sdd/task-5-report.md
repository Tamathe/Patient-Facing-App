# Task 5 Report: Local State, Persistence, and Audit Events

## Scope Completed

- Added `src/domain/audit.ts` with `recordAuditEvent(patientId, action, label)`.
- Added `src/state/storage.ts` with `STORAGE_KEY = "home-health-ai-ownership-state"` and helpers:
  - `loadStoredState()`
  - `saveStoredState(state)`
  - `clearStoredState()`
- Added `src/state/store.tsx` with:
  - `HealthAction` union
  - `healthReducer()` handling all task actions and audit recording
  - `HealthStateProvider` client component
  - `useHealthState()` hook
- Added `src/state/store.test.ts` reducer tests for:
  - adding a blood pressure reading
  - medication barrier updates while preserving medication metadata
- Wired `HealthStateProvider` into `src/app/layout.tsx`.

## Files Changed

- `src/domain/audit.ts` (new)
- `src/state/storage.ts` (new)
- `src/state/store.tsx` (new)
- `src/state/store.test.ts` (new)
- `src/app/layout.tsx` (modified)

## Validation

- `npm run test -- src/state/store.test.ts` ✅ PASS (2 tests)
- `npm run test` ✅ PASS (all tests; 7 files, 27 tests)

## Commit

- `08af1a7` — `feat: add local health state`

## Notes

- No additional caveats encountered.

## Reviewer Fix Report (Task 5 follow-up)

- Fixed `src/state/store.tsx`:
  - Made `healthReducer()` handle `resetDemo` explicitly.
  - Changed default reducer path to return the current `state` instead of `demoState` to avoid silent live-state resets.
- Fixed `src/state/storage.ts`:
  - Wrapped `JSON.parse()` in `loadStoredState()` with `try/catch`.
  - On parse failure, remove malformed entry from `localStorage` and return `demoState`.
- Added explicit reducer regression test in `src/state/store.test.ts`:
  - `resetDemo` returns `demoState`.
- Added `src/state/storage.test.ts`:
  - Malformed `localStorage` payload does not throw.
  - Malformed payload is cleared and fallback `demoState` is returned.

### Commands executed

- `npm run test -- src/state/store.test.ts`
  - PASS
  - 1 file, 3 tests
- `npm run test`
  - PASS
  - 8 files, 29 tests

## Task 5 Reviewer Follow-up (Shape Validation)

- Added local shape validation in `src/state/storage.ts`:
  - `loadStoredState()` now parses JSON, verifies required `AppState` top-level shape (`patient`, `carePlan`, and required arrays), and falls back to `demoState` with `localStorage` cleanup when invalid.
- Extended `src/state/storage.test.ts`:
  - new test for syntactically valid but structurally invalid payload verifies fallback to `demoState`, no throw, and storage key removal.

### Commands executed (follow-up)

- `npm run test -- src/state/store.test.ts src/state/storage.test.ts`
  - PASS
  - 2 files, 5 tests
- `npm run test`
  - PASS
  - 8 files, 30 tests

## Task 5 Additional Fixes (Deep storage validation + save guard)

- Updated `src/state/storage.ts` to deeply validate `AppState` payloads before hydration:
  - Added nested checks for full `patient` and `carePlan` shapes.
  - Added element-level guards for `medications`, `readings`, `tasks`, `contextItems`, `extractedFacts`, `aiMessages`, and `auditEvents` with required field checks.
  - Kept fallback behavior: invalid shape clears `localStorage` key and returns `demoState`.
  - Added `try/catch` guard in `saveStoredState()` around `localStorage.setItem` to prevent quota/blocked-storage crashes.
- Extended `src/state/storage.test.ts` with required regression coverage:
  - malformed `medications: [{}]` falls back to `demoState` and clears storage
  - malformed `auditEvents: ["oops"]` falls back to `demoState` and clears storage
  - `saveStoredState()` does not throw when `localStorage.setItem` throws

### Commands executed (post-fix)

- `npm run test -- src/state/store.test.ts src/state/storage.test.ts`
  - PASS
  - 2 files, 8 tests
- `npm run test`
  - PASS
  - 8 files, 33 tests

## Reviewer Finding Fix (Measurement validation)

- Updated `src/state/storage.ts` `isReading()`:
  - `pulse` now requires `number | null` by checking `value.pulse === null || hasNumber(value, "pulse")`.
  - `contexts` now requires each item to be a valid `MeasurementContext` (`morning`, `evening`, `before_medicine`, `after_medicine`, `after_coffee`, `after_resting`, `during_symptoms`).
- Added regression test in `src/state/storage.test.ts`:
  - Invalid reading payload with `pulse: "72"` and `contexts: ["foo"]` now returns `demoState`, and the stored entry is removed.

### Commands executed (reviewer-fix regression)

- `npm run test -- src/state/store.test.ts src/state/storage.test.ts`
  - PASS
  - 2 files, 9 tests
- `npm run test`
  - PASS
  - 8 files, 34 tests

## Task 5 Review Finding Fixes (Storage Resilience + Relational Validation)

- `src/state/storage.ts`
  - Added local `safeGetItem`, `safeSetItem`, and `safeRemoveItem` helpers.
  - Used safe helpers in `loadStoredState`, `saveStoredState`, and `clearStoredState`.
  - Extended validation to include:
    - `carePlan.patientId === patient.id`
    - `medication.patientId`, `reading.patientId`, `contextItem.patientId`, and `auditEvent.patientId` must match `patient.id`
    - every `extractedFact.contextItemId` must reference an existing context item id
    - every `aiMessage.sources` entry must map to a known source id from care plan, care goals, medications, context items, extracted facts, or readings.
  - Kept fallback behavior to `demoState` with storage cleanup on relational/shape violations.

- `src/state/storage.test.ts`
  - Added regressions for:
    - `loadStoredState()` returns `demoState` when `localStorage.getItem` throws.
    - `clearStoredState()` does not throw when `localStorage.removeItem` throws.
    - care plan patient-id mismatch falls back and clears storage.
    - nested patient-id mismatch in medication (and valid reading included) falls back and clears storage.
    - extracted fact with unknown `contextItemId` falls back and clears storage.

### Commands executed (final Task 5 review-fix run)

- `npm run test -- src/state/store.test.ts src/state/storage.test.ts`
  - PASS
  - 2 files, 14 tests
- `npm run test`
  - PASS
  - 8 files, 39 tests

## Task 6 Build-Fix Regression (Guard Generics / TS Strictness)

- Updated `src/state/storage.ts`:
  - Changed `hasString`/`hasNumber` to keyed generic object-shape predicates so property checks compose without collapsing the variable to `never`:
    - `hasString<K extends string>(value: unknown, key: K): value is Record<K, string> & Record<string, unknown>`
    - `hasNumber<K extends string>(value: unknown, key: K): value is Record<K, number> & Record<string, unknown>`
  - Kept all existing validation semantics (including `pulse` optional-`number` handling and existing relational checks).
  - Adjusted final `isValidAppState` return path with a constrained cast at the `hasValidRelationships` boundary to satisfy final strict type check after composing the narrowed object shape.
- Commands executed for this build regression:
  - `npm run test -- src/state/store.test.ts src/state/storage.test.ts`
    - PASS
    - 2 files, 14 tests
- `npm run test`
  - PASS
  - 9 files, 40 tests
  - `npm run build`
    - PASS

## Reviewer Finding Fix (Threshold finite validation)

- `src/state/storage.ts`
  - Tightened `isCarePlan()` thresholds to require finiteness:
    - `callThresholdSystolic === null || Number.isFinite(value.callThresholdSystolic)`
    - `callThresholdDiastolic === null || Number.isFinite(value.callThresholdDiastolic)`
- `src/state/storage.test.ts`
  - Added regression for a persisted raw JSON state with non-finite threshold (`1e309`) that must fall back to `demoState` and clear storage.

### Commands executed (threshold fix verification)

- `npm run test -- src/state/store.test.ts src/state/storage.test.ts`
  - PASS
  - 2 files, 15 tests
- `npm run test`
  - PASS
  - 9 files, 41 tests
- `npm run build`
  - PASS
