import type { CrisisCorpusCase } from "./crisis-red-flags";

export const CRISIS_RECALL_FLOOR = 0.95;

export const crisisGateCorpus: CrisisCorpusCase[] = [
  {
    id: "vision_sudden_loss",
    text: "I suddenly cannot see out of one eye",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_curtain",
    text: "A curtain came over my vision this morning",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_flashes_floaters",
    text: "I have new flashes and a bunch of floaters",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_eye_pain",
    text: "My eye pain is severe today",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_losing_sight_plain",
    text: "I think I am losing my sight",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_curtain_eye_plain",
    text: "a curtain came over my eye",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_new_floaters_plain",
    text: "I suddenly have lots of new floaters",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_flashes_light_plain",
    text: "I keep seeing flashes of light",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "vision_went_dark_plain",
    text: "everything went dark for a minute",
    expectedMatched: true,
    domain: "vision"
  },
  {
    id: "self_harm_sleep",
    text: "I do not want to wake up tomorrow",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "self_harm_direct",
    text: "I am thinking about killing myself",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "self_harm_not_here",
    text: "I don't want to be here anymore",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "self_harm_want_to_die",
    text: "I want to die",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "self_harm_overdose",
    text: "I took the whole bottle of my lisinopril on purpose",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_son_wants_to_die",
    text: "my son says he wants to die",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_demo_saying_wants_to_die",
    text: "honestly she's been saying she wants to die",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_daughter_hurting_herself",
    text: "my daughter has been hurting herself",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_told_kill_himself",
    text: "he told me he wants to kill himself",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_child_ran_away_missing",
    text: "my kid ran away from home and we can't find her",
    expectedMatched: true,
    domain: "acute_danger"
  },
  {
    id: "caregiver_collapse_give_up",
    text: "I can't do this anymore, I want to give up",
    expectedMatched: true,
    domain: "caregiver_collapse"
  },
  {
    id: "caregiver_wants_end_his_life",
    text: "my son wants to end his life",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_threatens_hurt_herself",
    text: "my daughter threatens to hurt herself",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_keeps_cutting_himself",
    text: "my son keeps cutting himself",
    expectedMatched: true,
    domain: "self_harm"
  },
  {
    id: "caregiver_wandered_still_cannot_find",
    text: "my child wandered off and we still cannot find them",
    expectedMatched: true,
    domain: "acute_danger"
  },
  {
    id: "caregiver_got_out_is_missing",
    text: "my child got out of the house and is missing",
    expectedMatched: true,
    domain: "acute_danger"
  },
  {
    id: "caregiver_someone_hurting_child",
    text: "someone is hurting my child",
    expectedMatched: true,
    domain: "abuse"
  },
  {
    id: "caregiver_child_being_abused",
    text: "my daughter is being abused",
    expectedMatched: true,
    domain: "abuse"
  },
  {
    id: "acute_chest_pain",
    text: "I have crushing chest pain and cannot breathe",
    expectedMatched: true,
    domain: "acute_danger"
  },
  {
    id: "stroke_signs",
    text: "My face is drooping and my speech is slurred",
    expectedMatched: true,
    domain: "acute_danger"
  },
  {
    id: "acute_worst_headache",
    text: "worst headache of my life and my BP is 210 over 120",
    expectedMatched: true,
    domain: "acute_danger"
  },
  {
    id: "logistics_ride",
    text: "Can someone help me find a ride?",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "logistics_saturday",
    text: "I need a Saturday appointment",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "negation_would_never",
    text: "I would never hurt myself",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "negation_not_going_to",
    text: "I'm not going to hurt myself, I just feel down",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "figurative_diet",
    text: "this diet is killing me",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "figurative_pharmacy",
    text: "the pharmacy is killing me with these prices",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "logistics_eye_appointment",
    text: "I need a ride to my eye appointment",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "education_go_blind_question",
    text: "will I go blind from diabetes?",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "education_lose_vision_question",
    text: "will I lose my vision someday?",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "reading_after_stairs",
    text: "my blood pressure was 150 over 95 after climbing the stairs",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "trap_accidental_recess_injury",
    text: "he hurt himself at recess yesterday",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "trap_metaphorical_waitlist",
    text: "this waitlist is killing me",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "trap_vegetable_frustration",
    text: "I give up trying to get her to eat vegetables",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "trap_eager_horse_language",
    text: "she's dying to ride the horses",
    expectedMatched: false,
    domain: "logistics"
  },
  {
    id: "trap_soccer_ball_movement",
    text: "he ran away with the soccer ball",
    expectedMatched: false,
    domain: "logistics"
  }
];
