# Crisis gate red-team result

## Date

2026-07-06

## Command

```
npx vitest run src/domain/crisis-red-flags.test.ts src/ai/safety-gate.test.ts
```

## Result

PASS

## Output

```
RUN  v2.1.9 C:/Patient centered

 ✓ src/domain/crisis-red-flags.test.ts (11 tests) 5ms
 ✓ src/ai/safety-gate.test.ts (35 tests) 19ms

 Test Files  2 passed (2)
      Tests  46 passed (46)
   Start at  13:20:26
   Duration  1.48s (transform 137ms, setup 272ms, collect 205ms, tests 24ms, environment 1.29s, prepare 198ms)
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
