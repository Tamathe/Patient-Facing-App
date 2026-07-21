import type { DevNeedDomain, FamilyProfile } from "./types";

/**
 * Caregiver vignettes with the recommendation we expect back.
 *
 * ENGINEERING DRAFTS. Every entry whose `reviewedBy` is empty was written by the
 * build, not by a clinician. The gate makes recommendation quality *visible*, not
 * *validated* — a passing report on unreviewed vignettes means the engine does
 * what we told it to, and says nothing about whether we told it the right thing.
 * Clinician sign-off fills `reviewedBy` / `reviewedAt`.
 *
 * `mustNotIncludeIds` is where the real regressions get caught: it encodes
 * "never lead with this for that", which is exactly the failure that motivated
 * this work (a violent-exclusion case answered with help-with-reading).
 */
export type FamilyVignette = {
  id: string;
  language: "en" | "es";
  text: string;
  profile: FamilyProfile;
  expectedLead: DevNeedDomain;
  mustIncludeIds: string[];
  /** Must not appear in the top LEAD_WINDOW recommendations. */
  mustNotIncludeIds: string[];
  expectSafetyBanner: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
};

/** How many leading cards a mustNotIncludeIds entry is barred from. */
export const LEAD_WINDOW = 3;

function profile(
  county: string,
  birthYear: number,
  schoolStage: FamilyProfile["schoolStage"],
  extra: Partial<FamilyProfile> = {}
): FamilyProfile {
  return { county, birthYear, schoolStage, diagnoses: [], ...extra };
}

export const FAMILY_VIGNETTES: FamilyVignette[] = [
  {
    id: "breathitt_school_exclusion",
    language: "en",
    text: "I have a seven-year-old who has behavioral issues. He has seemingly explosive anger and doesn't pay attention to me when I scold or direct his behavior. He has been kicked out of school several times for violence and acting out. He has been harmful towards animals. We live in Breathitt County and we need help.",
    profile: profile("Breathitt", 2019, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: ["idea_school_discipline", "kde_evaluation_request", "fba_bip_request"],
    mustNotIncludeIds: ["kde_parent_toolbox"],
    expectSafetyBanner: true
  },
  {
    id: "school_exclusion_no_animal_harm",
    language: "en",
    text: "My son is in second grade and has been suspended four times this year for hitting and throwing chairs. The school keeps calling me to come get him. I do not know what my rights are.",
    profile: profile("Fayette", 2019, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: ["idea_school_discipline"],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "reading_help_plain",
    language: "en",
    text: "Reading homework is a nightly battle. She is in fourth grade and still cannot sound out words her classmates can. Her teacher says she is just behind.",
    profile: profile("Scott", 2017, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: [],
    mustNotIncludeIds: ["idea_school_discipline"],
    expectSafetyBanner: false
  },
  {
    id: "toddler_speech_delay",
    language: "en",
    text: "My son is two and barely talks. He points and grunts but has maybe five words. The doctor said wait and see but I am worried.",
    profile: profile("Perry", 2024, "not_school_age"),
    expectedLead: "early_intervention",
    mustIncludeIds: [],
    mustNotIncludeIds: ["idea_school_discipline", "kde_evaluation_request"],
    expectSafetyBanner: false
  },
  {
    id: "waiver_money_worry",
    language: "en",
    text: "Money is tight and I keep hearing about waivers from other parents but I have no idea where to start or what we qualify for.",
    profile: profile("Jefferson", 2018, "elementary"),
    expectedLead: "waivers_financial",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "caregiver_burnout_respite",
    language: "en",
    text: "I am exhausted and overwhelmed. I have not had a break in two years and I do not know who could even watch him for an afternoon.",
    profile: profile("Warren", 2016, "elementary"),
    expectedLead: "respite",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "caregiver_collapse_banner",
    language: "en",
    text: "I can't do this anymore and some days I want to give up completely. Nothing I try with him works.",
    profile: profile("Pike", 2017, "elementary"),
    expectedLead: "parent_support",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: true
  },
  {
    id: "reported_child_ideation_banner",
    language: "en",
    text: "Honestly she's been saying she wants to die. She is nine and I do not know what to do about school either.",
    profile: profile("Fayette", 2017, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: true
  },
  {
    id: "harm_to_classmates_banner",
    language: "en",
    text: "He has been hurting other kids at school and the principal says the next step is expulsion. He is eight.",
    profile: profile("Kenton", 2018, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: ["idea_school_discipline"],
    mustNotIncludeIds: [],
    expectSafetyBanner: true
  },
  {
    id: "missing_child_banner",
    language: "en",
    text: "My son ran away from home and we still cannot find him. He is autistic and does not answer when we call.",
    profile: profile("Boone", 2015, "middle"),
    expectedLead: "parent_support",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: true
  },
  {
    id: "no_food_today_banner",
    language: "en",
    text: "There is no food today and my kids are hungry. I also need help with his therapy appointments.",
    profile: profile("Harlan", 2018, "elementary"),
    expectedLead: "therapies",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: true
  },
  {
    id: "transportation_barrier",
    language: "en",
    text: "We cannot get to any of the therapy appointments because I do not have a ride and the drive is over an hour.",
    profile: profile("Leslie", 2019, "elementary"),
    expectedLead: "therapies",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "sibling_support_need",
    language: "en",
    text: "His sister is struggling with all of this. She acts out for attention and I feel like she is getting lost.",
    profile: profile("Madison", 2016, "elementary"),
    expectedLead: "sibling_support",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "transition_planning_teen",
    language: "en",
    text: "He turns fifteen next month and nobody has talked to us about what happens after high school or about guardianship.",
    profile: profile("Daviess", 2011, "high"),
    expectedLead: "future_planning",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "recreation_and_clubs",
    language: "en",
    text: "She loves horses and I would like to find sports or clubs where she would actually be welcome.",
    profile: profile("Scott", 2016, "elementary"),
    expectedLead: "recreation",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "parent_support_unsure",
    language: "en",
    text: "We just got the diagnosis last week and I don't know where to start. I have never felt this alone.",
    profile: profile("Pulaski", 2020, "preschool"),
    expectedLead: "parent_support",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "rural_county_thin_match",
    language: "en",
    text: "We need occupational therapy and there is nothing close to us. The nearest place we found is two counties over.",
    profile: profile("Owsley", 2019, "elementary"),
    expectedLead: "therapies",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "iep_exists_wants_more",
    language: "en",
    text: "She already has an IEP but nothing in it addresses the meltdowns, and the school just sends her home.",
    profile: profile("Hardin", 2017, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: ["fba_bip_request"],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "eighteen_month_motor",
    language: "en",
    text: "Our eighteen-month-old is not walking yet and does not pull up on furniture like her cousin did.",
    profile: profile("Fayette", 2025, "not_school_age"),
    expectedLead: "early_intervention",
    mustIncludeIds: [],
    mustNotIncludeIds: ["idea_school_discipline"],
    expectSafetyBanner: false
  },
  {
    id: "rough_with_dog_not_a_banner",
    language: "en",
    text: "He is rough with the dog sometimes and we are working on it. Mostly I need help with his behavior at school.",
    profile: profile("Laurel", 2018, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "es_school_exclusion",
    language: "es",
    text: "Mi hijo de siete años ha sido expulsado de la escuela varias veces por pelear. Vivimos en el condado de Scott y no sé qué hacer.",
    profile: profile("Scott", 2019, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: ["idea_school_discipline"],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "es_speech_delay_toddler",
    language: "es",
    text: "Mi hija tiene dos años y casi no habla. El doctor dice que esperemos pero estoy preocupada.",
    profile: profile("Perry", 2024, "not_school_age"),
    expectedLead: "early_intervention",
    mustIncludeIds: [],
    mustNotIncludeIds: ["idea_school_discipline"],
    expectSafetyBanner: false
  },
  {
    id: "es_reported_ideation_banner",
    language: "es",
    text: "Mi hija dice que quiere morir. También necesito ayuda con la escuela.",
    profile: profile("Fayette", 2015, "middle"),
    expectedLead: "school_iep",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: true
  },
  {
    id: "es_harm_to_animals_banner",
    language: "es",
    text: "Mi hijo lastima a los animales cuando se enoja y en la escuela dicen que es agresivo.",
    profile: profile("Jefferson", 2018, "elementary"),
    expectedLead: "school_iep",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: true
  },
  {
    id: "es_waivers_money",
    language: "es",
    text: "El dinero está muy apretado y escuché de las exenciones pero no sé cómo empezar.",
    profile: profile("Warren", 2017, "elementary"),
    expectedLead: "waivers_financial",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  },
  {
    id: "es_respite_exhausted",
    language: "es",
    text: "Estoy agotada y abrumada. No he tenido un descanso en mucho tiempo.",
    profile: profile("Pike", 2016, "elementary"),
    expectedLead: "respite",
    mustIncludeIds: [],
    mustNotIncludeIds: [],
    expectSafetyBanner: false
  }
];
