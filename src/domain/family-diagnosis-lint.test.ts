import { describe, expect, it } from "vitest";
import { schoolAgeFamilyState } from "./family-fixtures";
import {
  containsFamilyDiagnosisClaim,
  filterUnsupportedDiagnosisFacts,
  stripUnsafeFamilyRationales
} from "./family-diagnosis-lint";

describe("containsFamilyDiagnosisClaim", () => {
  it("allows generic educational and concern-based phrasing", () => {
    expect(containsFamilyDiagnosisClaim("children with autism often need routines", "Riley")).toBe(false);
    expect(containsFamilyDiagnosisClaim("the concerns you described may be worth discussing", "Riley")).toBe(false);
  });

  it("blocks direct developmental diagnosis claims", () => {
    expect(containsFamilyDiagnosisClaim("this sounds like dyslexia", "Riley")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Riley has autism", "Riley")).toBe(true);
    expect(containsFamilyDiagnosisClaim("your child has ADHD")).toBe(true);
    expect(containsFamilyDiagnosisClaim("she was diagnosed with dyslexia")).toBe(true);
    expect(containsFamilyDiagnosisClaim("he is diagnosed with developmental delay")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Riley appears to have Down syndrome", "Riley")).toBe(true);
  });

  it("escapes a dynamic child first name before building a regular expression", () => {
    expect(containsFamilyDiagnosisClaim("Avery.* has autism", "Avery.*")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Avery Jordan has autism", "Avery.*")).toBe(false);
  });

  it("uses Unicode-aware whole-name boundaries for dynamic child names", () => {
    expect(containsFamilyDiagnosisClaim("The summary says Élodie has autism", "Élodie")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Jo-Ann has autism", "Ann")).toBe(false);
  });

  it("blocks Spanish diagnosis claims while allowing concern-based Spanish rationale copy", () => {
    expect(containsFamilyDiagnosisClaim("Riley tiene autismo", "Riley")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Su hija tiene TDAH")).toBe(true);
    expect(containsFamilyDiagnosisClaim("Esto parece dislexia")).toBe(true);
    expect(
      containsFamilyDiagnosisClaim(
        "Mencionaste la escuela, un IEP o ayuda con la lectura."
      )
    ).toBe(false);
  });

  it.each([
    "Riley likely has autism",
    "Riley may have ADHD",
    "Riley seems to have dyslexia",
    "Your daughter has autism",
    "My daughter was diagnosed with autism",
    "Riley has a diagnosis of autism",
    "Riley was diagnosed as autistic",
    "Riley's symptoms indicate autism"
  ])("blocks broader English diagnostic rationale wording: %s", (rationale) => {
    expect(containsFamilyDiagnosisClaim(rationale, "Riley")).toBe(true);
  });

  it.each([
    "Riley probablemente tiene autismo",
    "Riley puede tener TDAH",
    "Riley parece tener dislexia",
    "Su hija tiene autismo",
    "Mi hija fue diagnosticada con autismo",
    "Riley tiene un diagnóstico de autismo",
    "Riley fue diagnosticada como autista",
    "Los síntomas de Riley indican autismo"
  ])("blocks broader Spanish diagnostic rationale wording: %s", (rationale) => {
    expect(containsFamilyDiagnosisClaim(rationale, "Riley")).toBe(true);
  });

  it("keeps clearly non-diagnostic educational wording", () => {
    expect(containsFamilyDiagnosisClaim("This is autism education, not a diagnosis", "Riley")).toBe(false);
  });

  it.each([
    "Riley could be autistic",
    "Riley may be autistic",
    "Riley seems autistic",
    "Riley appears autistic",
    "Riley is probably autistic",
    "Riley maybe has autism",
    "Autism is possible for Riley",
    "Riley podría tener autismo",
    "Riley podría ser autista",
    "Riley puede ser autista",
    "Riley es probablemente autista",
    "Es posible que Riley tenga autismo",
    "Riley's diagnosis is autism",
    "Riley has an autism diagnosis",
    "A diagnosis of autism fits Riley",
    "Riley meets diagnostic criteria for autism",
    "The child has autism",
    "Our child has autism",
    "Their daughter has autism",
    "Riley is on the autism spectrum",
    "Riley cumple criterios diagnósticos de autismo",
    "La niña tiene autismo",
    "Nuestro hijo tiene autismo",
    "Riley está diagnosticada con autismo",
    "Riley padece autismo",
    "Her symptoms indicate autism",
    "The child's symptoms indicate autism",
    "These symptoms indicate autism",
    "Symptoms indicate autism",
    "Riley's symptoms are consistent with autism",
    "Riley's behavior suggests autism",
    "Sus síntomas indican autismo",
    "Los síntomas de su hija indican autismo",
    "Estos síntomas indican autismo",
    "Los síntomas son compatibles con autismo"
  ])("blocks adversarial direct, speculative, and symptom rationale wording: %s", (rationale) => {
    expect(containsFamilyDiagnosisClaim(rationale, "Riley")).toBe(true);
  });

  it.each([
    "Riley has autism-related education questions",
    "Riley has autism-focused reading material"
  ])("keeps diagnosis-adjacent educational wording: %s", (rationale) => {
    expect(containsFamilyDiagnosisClaim(rationale, "Riley")).toBe(false);
  });
});

describe("stripUnsafeFamilyRationales", () => {
  it("drops only unsafe rationale text and preserves each domain object", () => {
    const domains = [
      { domain: "school_iep" as const, rationale: "This sounds like dyslexia", source: "live" as const },
      {
        domain: "parent_support" as const,
        rationale: "The concerns you described can feel isolating",
        source: "mock" as const
      }
    ];

    expect(stripUnsafeFamilyRationales(domains, "Riley")).toEqual([
      { domain: "school_iep", source: "live" },
      {
        domain: "parent_support",
        rationale: "The concerns you described can feel isolating",
        source: "mock"
      }
    ]);
  });
});

describe("filterUnsupportedDiagnosisFacts", () => {
  const profile = schoolAgeFamilyState.profile!;

  it("keeps arbitrary live facts that are not diagnostic claims", () => {
    const rawText =
      "Riley gets reading support at school. She completed occupational therapy last year.";
    const facts = [
      {
        label: "Current school supports",
        value: "Reading support",
        sourceSnippet: "Riley gets reading support at school"
      },
      {
        label: "Therapy history",
        value: "Completed occupational therapy last year",
        sourceSnippet: "She completed occupational therapy last year"
      }
    ];

    expect(filterUnsupportedDiagnosisFacts(facts, rawText, profile)).toEqual(facts);
  });

  it("keeps affirmative child-specific canonical facts and non-diagnosis inferred facts", () => {
    const rawText =
      "She was just diagnosed with dyslexia and ADHD. Riley was diagnosed with autism. Reading is really hard for her at school.";
    const facts = [
      {
        label: "Reported diagnosis",
        value: "dyslexia and ADHD",
        sourceSnippet: "She was just diagnosed with dyslexia and ADHD"
      },
      {
        label: "Reported diagnosis",
        value: "autism",
        sourceSnippet: "Riley was diagnosed with autism"
      },
      {
        label: "About school and learning",
        value: "School and learning may need support",
        sourceSnippet: "Reading is really hard for her at school"
      }
    ];

    expect(filterUnsupportedDiagnosisFacts(facts, rawText, profile)).toEqual(facts);
  });

  it.each([
    ["unknown", "cerebral palsy", "Riley was diagnosed with cerebral palsy"],
    ["mixed known and unknown", "autism and epilepsy", "Riley was diagnosed with autism"],
    ["negated", "autism", "Riley was not diagnosed with autism"],
    ["interrogative", "autism", "Has Riley been diagnosed with autism?"],
    ["question context", "autism", "We are asking whether Riley was diagnosed with autism"],
    ["caregiver subject", "autism", "I was diagnosed with autism, not Riley"],
    ["brochure subject", "autism", "Children diagnosed with autism may need support"]
  ])("drops a %s diagnosis claim despite an exact source snippet", (_case, value, sourceSnippet) => {
    expect(
      filterUnsupportedDiagnosisFacts(
        [{ label: "Reported diagnosis", value, sourceSnippet }],
        sourceSnippet,
        profile
      )
    ).toEqual([]);
  });

  it("allows a profile-supported canonical term only when the same snippet contains it", () => {
    const facts = [
      { label: "Reported diagnosis", value: "ADHD", sourceSnippet: "ADHD affects homework" },
      { label: "Reported diagnosis", value: "dyslexia", sourceSnippet: "Homework is difficult" }
    ];
    const rawText = "ADHD affects homework. Homework is difficult.";

    expect(filterUnsupportedDiagnosisFacts(facts, rawText, profile)).toEqual([facts[0]]);
  });

  it("allows an unknown diagnosis only when it exactly matches a profile Other label in the snippet", () => {
    const otherProfile = {
      ...profile,
      diagnoses: [
        ...profile.diagnoses,
        { id: "other-cp", label: "other" as const, otherLabel: "cerebral palsy" }
      ]
    };
    const facts = [
      {
        label: "Reported diagnosis",
        value: "cerebral palsy",
        sourceSnippet: "Riley's cerebral palsy affects mobility"
      }
    ];

    expect(filterUnsupportedDiagnosisFacts(facts, facts[0].sourceSnippet, otherProfile)).toEqual(facts);
  });

  it.each([
    ["English negation", "ADHD", "Riley was not diagnosed with ADHD"],
    ["English wrong person", "ADHD", "I was diagnosed with ADHD, not Riley"],
    ["English brochure", "ADHD", "Children diagnosed with ADHD may need support"],
    ["Spanish negation", "TDAH", "Riley no fue diagnosticada con TDAH"],
    ["Spanish wrong person", "TDAH", "A mí me diagnosticaron TDAH, no a Riley"],
    ["Spanish brochure", "TDAH", "Niños diagnosticados con TDAH pueden necesitar apoyo"]
  ])("rejects profile-backed diagnoses in unsafe %s context", (_case, value, sourceSnippet) => {
    expect(
      filterUnsupportedDiagnosisFacts(
        [{ label: "Reported diagnosis", value, sourceSnippet }],
        sourceSnippet,
        profile
      )
    ).toEqual([]);
  });

  it.each([
    ["English denial", "ADHD", "Riley was diagnosed with ADHD, but she does not have ADHD"],
    ["English retraction", "ADHD", "Riley was diagnosed with ADHD, but that diagnosis was ruled out"],
    ["Spanish denial", "TDAH", "Riley fue diagnosticada con TDAH, pero no tiene TDAH"],
    ["Spanish retraction", "TDAH", "Riley fue diagnosticada con TDAH, pero el diagnóstico fue descartado"]
  ])("rejects a diagnosis followed by a %s", (_case, value, sourceSnippet) => {
    expect(
      filterUnsupportedDiagnosisFacts(
        [{ label: "Reported diagnosis", value, sourceSnippet }],
        sourceSnippet,
        profile
      )
    ).toEqual([]);
  });

  it.each([
    ["Medical history", "This brochure explains cerebral palsy support"],
    ["Background", "Children with cerebral palsy may need support"]
  ])("does not let an unknown diagnosis bypass validation under the %s label", (label, sourceSnippet) => {
    expect(
      filterUnsupportedDiagnosisFacts(
        [{ label, value: "cerebral palsy", sourceSnippet }],
        sourceSnippet,
        profile
      )
    ).toEqual([]);
  });

  it.each([
    ["English", "dyslexia, ADHD", "She was just diagnosed with dyslexia, ADHD"],
    ["Spanish", "dislexia, TDAH", "A Riley le diagnosticaron dislexia, TDAH"]
  ])("keeps an explicit %s comma-separated canonical diagnosis list", (_language, value, sourceSnippet) => {
    const facts = [{ label: "Reported diagnosis", value, sourceSnippet }];

    expect(filterUnsupportedDiagnosisFacts(facts, sourceSnippet, profile)).toEqual(facts);
  });

  it("recognizes ASD as a canonical autism alias", () => {
    const sourceSnippet = "Riley was diagnosed with ASD";
    const facts = [{ label: "Reported diagnosis", value: "ASD", sourceSnippet }];

    expect(filterUnsupportedDiagnosisFacts(facts, sourceSnippet, profile)).toEqual(facts);
  });

  const emptyProfile = { ...profile, diagnoses: [] };
  const autismProfile = {
    ...emptyProfile,
    diagnoses: [{ id: "diagnosis-autism", label: "autism" as const }]
  };
  const otherProfile = {
    ...emptyProfile,
    diagnoses: [{ id: "diagnosis-other", label: "other" as const, otherLabel: "cerebral palsy" }]
  };

  it.each([
    ["autism", "Riley wasn't diagnosed with autism"],
    ["autism", "Riley doesn't have autism"],
    ["autism", "Riley isn't autistic"],
    ["autism", "Riley was misdiagnosed with autism"],
    ["autism", "Riley was diagnosed with autism, but it was a misdiagnosis"],
    ["autism", "Riley was diagnosed with autism, but that diagnosis was wrong"],
    ["autismo", "Mi hija carece de autismo"],
    ["autismo", "Sin diagnóstico de autismo para Riley"],
    ["autismo", "Descartaron autismo para Riley"],
    ["autismo", "A Riley le diagnosticaron autismo por error"],
    ["autismo", "El médico dijo que el diagnóstico de autismo fue equivocado"],
    ["autism", "We want to know if Riley has autism"],
    ["autism", "Could Riley have autism"],
    ["autismo", "Nos gustaría saber si Riley tiene autismo"],
    ["autismo", "Podría Riley tener autismo"],
    ["autism", "My husband has autism"],
    ["autism", "Riley's brother was diagnosed with autism"],
    ["autismo", "Mi esposo tiene autismo"],
    ["autismo", "El hermano de Riley tiene autismo"]
  ])("rejects adversarial profile-backed diagnosis context: %s — %s", (value, sourceSnippet) => {
    expect(
      filterUnsupportedDiagnosisFacts(
        [{ label: "Reported diagnosis", value, sourceSnippet }],
        sourceSnippet,
        autismProfile
      )
    ).toEqual([]);
  });

  it.each(["Riley doesn't have cerebral palsy", "My husband has cerebral palsy"])(
    "rejects adversarial profile-Other diagnosis context: %s",
    (sourceSnippet) => {
      expect(
        filterUnsupportedDiagnosisFacts(
          [{ label: "Reported diagnosis", value: "cerebral palsy", sourceSnippet }],
          sourceSnippet,
          otherProfile
        )
      ).toEqual([]);
    }
  );

  it.each(["epilepsy", "cerebral palsy"])(
    "rejects the invented condition %s hidden behind an arbitrary fact label",
    (value) => {
      const sourceSnippet = "Homework is difficult";
      expect(
        filterUnsupportedDiagnosisFacts(
          [{ label: "Caregiver report", value, sourceSnippet }],
          sourceSnippet,
          emptyProfile
        )
      ).toEqual([]);
    }
  );

  it.each([
    ["autism", "My daughter has autism"],
    ["autism", "Riley has autism"],
    ["autism", "Riley's diagnosis is autism"],
    ["autism", "The pediatrician diagnosed Riley with autism"],
    ["autism", "Riley received an autism diagnosis"],
    ["autism", "Riley is autistic"],
    ["ADHD combined type", "Riley was diagnosed with ADHD combined type"],
    ["autism (level 1)", "Riley was diagnosed with autism (level 1)"],
    ["autismo", "Ella fue diagnosticada con autismo"],
    ["autismo", "Mi hija tiene autismo"],
    ["autismo", "El pediatra diagnosticó a Riley con autismo"],
    ["TDAH", "Él tiene un diagnóstico de TDAH"]
  ])("keeps adversarial explicit child diagnosis fact: %s — %s", (value, sourceSnippet) => {
    const facts = [{ label: "Reported diagnosis", value, sourceSnippet }];
    expect(filterUnsupportedDiagnosisFacts(facts, sourceSnippet, emptyProfile)).toEqual(facts);
  });
});
