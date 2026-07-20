# Crisis gate red-team result

## Date

2026-07-20

## Command

```
npx vitest run src/domain/crisis-red-flags.test.ts src/ai/safety-gate.test.ts src/domain/front-door.test.ts src/domain/safety.test.ts src/ai/voice-gate-corpus.test.ts src/ai/output-guard.test.ts
```

## Result

PASS

## Output

```
RUN  v2.1.9 C:/Patient centered

 ✓ src/domain/crisis-red-flags.test.ts (183 tests) 38ms
 ✓ src/domain/safety.test.ts (16 tests) 5ms
 ✓ src/ai/voice-gate-corpus.test.ts (2 tests) 25ms
 ✓ src/ai/safety-gate.test.ts (46 tests) 47ms
 ✓ src/ai/output-guard.test.ts (12 tests) 39ms
 ✓ src/domain/front-door.test.ts (45 tests) 29ms

 Test Files  6 passed (6)
      Tests  304 passed (304)
   Start at  16:41:44
   Duration  1.28s (transform 447ms, setup 528ms, collect 985ms, tests 183ms, environment 2.92s, prepare 537ms)
```

## Interpretation

Deterministic recall = 1.00 (all corpus positives detected); false positives = 0. Floor of 0.95 met.

The crisis classifier (`src/domain/crisis-red-flags.ts`, exported as
`classifyCrisis` in `src/domain/safety.ts`) is the F4 gate. Self-harm
disclosures route to the crisis tier (988/911/safety-plan) and the provider is
never called; sudden vision loss and acute danger route to the emergency tier.
Negation is handled by stripping negated self-harm spans before scanning, so
"I would never hurt myself" clears while "I want to die" still fires. This gate
is advisory-biased toward escalation, which spec 04 accepts.

The gate also runs the front-door routing invariant (`src/domain/front-door.ts`):
for every crisis-corpus positive, `decideFrontDoor` must return a Coach outcome
and must NEVER route the utterance to a feature screen. This makes "the router
sent a crisis to the BP form" a build-breaking failure, not a silent UX
regression, and confirms the front door can only navigate or defer — never write.
