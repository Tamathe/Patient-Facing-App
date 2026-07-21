# Navigator recommendation gate (live tier)

## Date

2026-07-21

## Command

```
npx vitest run src/domain/family-vignettes.live.test.ts
```

## Result

PASS

## Output

```
RUN  v2.1.9 C:/Patient centered

stdout | src/domain/family-vignettes.live.test.ts > family vignette gate (live tier) > reports deterministic-path coverage for every vignette

Vignettes: 26 (26 unreviewed engineering drafts)
  ok   breathitt_school_exclusion [en] resources=10
  ok   school_exclusion_no_animal_harm [en] resources=16
  ok   reading_help_plain [en] resources=16
  ok   toddler_speech_delay [en] resources=9
  ok   waiver_money_worry [en] resources=16
  ok   caregiver_burnout_respite [en] resources=12
  ok   caregiver_collapse_banner [en] resources=8
  ok   reported_child_ideation_banner [en] resources=16
  ok   harm_to_classmates_banner [en] resources=10
  ok   missing_child_banner [en] resources=8
  ok   no_food_today_banner [en] resources=7
  ok   transportation_barrier [en] resources=7
  ok   sibling_support_need [en] resources=4
  ok   transition_planning_teen [en] resources=17
  ok   recreation_and_clubs [en] resources=4
  ok   parent_support_unsure [en] resources=8
  ok   rural_county_thin_match [en] resources=7
  ok   iep_exists_wants_more [en] resources=10
  ok   eighteen_month_motor [en] resources=8
  ok   rough_with_dog_not_a_banner [en] resources=10
  ok   es_school_exclusion [es] resources=11
  ok   es_speech_delay_toddler [es] resources=9
  ok   es_reported_ideation_banner [es] resources=10
  ok   es_harm_to_animals_banner [es] resources=10
  ok   es_waivers_money [es] resources=14
  ok   es_respite_exhausted [es] resources=12

 ✓ src/domain/family-vignettes.live.test.ts (1 test) 39ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  14:36:46
   Duration  1.32s (transform 107ms, setup 95ms, collect 153ms, tests 39ms, environment 572ms, prepare 117ms)
```

## Interpretation

Advisory. This tier exercises the live extraction and ranking path against the
family vignette corpus and reports lead-concern accuracy against a target of
0.8. It does not gate the build: the build-breaking assertions are the
deterministic tier in `src/domain/family-vignettes.test.ts`, which runs inside
`npm run check` with zero environment variables.

Vignettes whose `reviewedBy` field is empty are engineering drafts, not
clinician-reviewed cases. A passing report on unreviewed vignettes means the
engine does what it was told; it says nothing about whether it was told the
right thing.
