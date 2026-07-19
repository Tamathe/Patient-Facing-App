import { describe, expect, it } from "vitest";
import { morganFamilyState } from "./family-fixtures";
import {
  buildMockFollowUps,
  extractFamilyInterviewMock,
  familyFactStatus,
  familyInterviewInputSchema,
  parseFamilyInterviewPayload
} from "./family-interview";
import type { DevNeedDomain } from "./types";

const validPayload = {
  facts: [{ label: "Grade", value: "fourth grade", sourceSnippet: "fourth grade" }],
  domains: [{ domain: "school_iep", rationale: "The caregiver described school concerns." }],
  followUps: [{ question: "What support has the school offered?", options: ["Nothing yet", "A meeting is planned"] }]
};

describe("family interview contract", () => {
  it("accepts only text from 10 through 5000 characters", () => {
    expect(familyInterviewInputSchema.safeParse("123456789").success).toBe(false);
    expect(familyInterviewInputSchema.safeParse("1234567890").success).toBe(true);
    expect(familyInterviewInputSchema.safeParse("x".repeat(5000)).success).toBe(true);
    expect(familyInterviewInputSchema.safeParse("x".repeat(5001)).success).toBe(false);
    expect(familyInterviewInputSchema.safeParse(" ".repeat(10)).success).toBe(false);
    expect(familyInterviewInputSchema.safeParse(` ${"x".repeat(4999)} `).success).toBe(false);
  });

  it("rejects unknown top-level and nested keys plus blank required strings", () => {
    expect(parseFamilyInterviewPayload({ ...validPayload, surprise: true })).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        facts: [{ ...validPayload.facts[0], confidence: "high" }]
      })
    ).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        domains: [{ ...validPayload.domains[0], resourceName: "A catalog row" }]
      })
    ).toBeNull();
    expect(parseFamilyInterviewPayload({ ...validPayload, facts: [{ label: "", value: "x", sourceSnippet: "x" }] })).toBeNull();
    expect(parseFamilyInterviewPayload({ ...validPayload, facts: [{ label: "x", value: "", sourceSnippet: "x" }] })).toBeNull();
    expect(parseFamilyInterviewPayload({ ...validPayload, facts: [{ label: "x", value: "x", sourceSnippet: "" }] })).toBeNull();
  });

  it("rejects domains outside the developmental need enum", () => {
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        domains: [{ domain: "made_up", rationale: "No." }]
      })
    ).toBeNull();
  });

  it("enforces the strict follow-up question contract", () => {
    expect(parseFamilyInterviewPayload({ ...validPayload, followUps: ["What support has the school offered?"] })).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        followUps: Array.from({ length: 4 }, (_, index) => ({ question: `Question ${index}?`, options: [] }))
      })
    ).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        followUps: [{ question: "Question?", options: ["1", "2", "3", "4", "5"] }]
      })
    ).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        followUps: [{ question: "q".repeat(201), options: [] }]
      })
    ).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        followUps: [{ question: "Question?", options: ["o".repeat(61)] }]
      })
    ).toBeNull();
    expect(
      parseFamilyInterviewPayload({
        ...validPayload,
        followUps: [{ question: "Question?", options: [], advice: "Do this" }]
      })
    ).toBeNull();
  });
});

describe("deterministic family interview extraction", () => {
  it("extracts Morgan's explicit grade and diagnoses plus an inferred school concern", () => {
    const profile = morganFamilyState.profile;
    expect(profile).not.toBeNull();
    const result = extractFamilyInterviewMock(morganFamilyState.interviewDraft, profile!, new Date("2026-07-17T12:00:00Z"));

    expect(result.facts).toEqual([
      { label: "Grade", value: "fourth grade", sourceSnippet: "fourth grade" },
      {
        label: "Reported diagnosis",
        value: "dyslexia and ADHD",
        sourceSnippet: "She was just diagnosed with dyslexia and ADHD"
      },
      {
        label: "School concern",
        value: "Reading and homework may need support",
        sourceSnippet: "Reading homework … nightly battle"
      }
    ]);
    expect(result.domains.map(({ domain }) => domain)).toEqual(["school_iep", "waivers_financial", "parent_support"]);
    expect(result.domains.every(({ rationale }) => !/Riley has|your child has|sounds like/i.test(rationale))).toBe(true);
    expect(result.followUps).toEqual([
      {
        question: "What has the school offered so far?",
        options: ["Nothing yet", "A meeting is planned", "An evaluation was done"]
      },
      {
        question: "Have you applied for any state programs yet?",
        options: ["Not yet", "Applied, still waiting", "Not sure"]
      },
      {
        question: "Who can take over for a few hours?",
        options: ["No one right now", "Family sometimes", "A paid helper"]
      }
    ]);
  });

  it("extracts the exact Spanish Morgan path with localized facts and rationales", () => {
    const text =
      "Mi hija está en cuarto grado en Georgetown. A mi hija le diagnosticaron dislexia y TDAH hace un par de meses. La tarea de lectura es una batalla cada noche y no sé qué pedirle a la escuela. El dinero está escaso y sigo escuchando sobre exenciones, pero no tengo idea de por dónde empezar.";
    const result = extractFamilyInterviewMock(text, morganFamilyState.profile!, new Date("2026-07-17T12:00:00Z"), "es");

    expect(result.facts).toEqual([
      { label: "Grado", value: "cuarto grado", sourceSnippet: "cuarto grado" },
      {
        label: "Diagnóstico informado",
        value: "dislexia y TDAH",
        sourceSnippet: "A mi hija le diagnosticaron dislexia y TDAH"
      },
      {
        label: "Preocupación escolar",
        value: "La lectura y la tarea podrían necesitar apoyo",
        sourceSnippet: "La tarea de lectura … una batalla cada noche"
      }
    ]);
    expect(result.domains).toEqual([
      {
        domain: "school_iep",
        rationale: "La persona cuidadora describió necesidades de apoyo escolar, del IEP o de lectura."
      },
      {
        domain: "waivers_financial",
        rationale: "La persona cuidadora preguntó por exenciones o apoyo económico."
      },
      {
        domain: "parent_support",
        rationale: "La persona cuidadora describió sentirse abrumada o no saber por dónde empezar."
      }
    ]);
    expect(result.followUps).toEqual([
      {
        question: "¿Qué ha ofrecido la escuela hasta ahora?",
        options: ["Nada todavía", "Hay una reunión planeada", "Ya hicieron una evaluación"]
      },
      {
        question: "¿Has solicitado algún programa estatal?",
        options: ["Todavía no", "Solicité y sigo esperando", "No estoy seguro"]
      },
      {
        question: "¿Quién puede encargarse por unas horas?",
        options: ["Nadie por ahora", "A veces la familia", "Una persona de apoyo pagada"]
      }
    ]);
  });

  it("returns two generic orientation questions when no domain matches", () => {
    expect(extractFamilyInterviewMock("We would like some guidance.", morganFamilyState.profile!).followUps).toEqual([
      {
        question: "What part of a typical day is hardest?",
        options: ["Mornings", "Afternoons", "Bedtime"]
      },
      {
        question: "Who helps your family right now?",
        options: ["No one", "Family or friends", "A professional"]
      }
    ]);
    expect(extractFamilyInterviewMock("Nos gustaría recibir orientación.", morganFamilyState.profile!, new Date(), "es").followUps).toEqual([
      {
        question: "¿Qué parte de un día típico es la más difícil?",
        options: ["Las mañanas", "Las tardes", "La hora de dormir"]
      },
      {
        question: "¿Quién ayuda a tu familia ahora?",
        options: ["Nadie", "Familiares o amigos", "Un profesional"]
      }
    ]);
  });

  it("keeps every canned question and chip isolated to its own domain and free of organization names", () => {
    const cases: Array<{ domains: DevNeedDomain[]; allowed: DevNeedDomain[] }> = [
      { domains: ["school_iep"], allowed: ["school_iep"] },
      { domains: ["therapies"], allowed: ["therapies"] },
      { domains: ["waivers_financial"], allowed: ["waivers_financial"] },
      { domains: ["respite"], allowed: ["respite", "parent_support"] },
      { domains: [], allowed: [] }
    ];

    for (const language of ["en", "es"] as const) {
      for (const { domains, allowed } of cases) {
        const followUps = buildMockFollowUps(domains, language);
        for (const text of followUps.flatMap(({ question, options }) => [question, ...options])) {
          const rematched = extractFamilyInterviewMock(text, morganFamilyState.profile!, new Date(), language).domains.map(
            ({ domain }) => domain
          );
          expect(rematched.every((domain) => allowed.includes(domain))).toBe(true);
          expect(text).not.toMatch(/First Steps|KY-SPIN|Michelle P\.|kynect|\b211\b/i);
        }
      }
    }
  });

  it.each([
    ["necesita apoyo con el habla y terapia", ["early_intervention", "therapies"]],
    ["necesito ayuda con la escuela, el IEP y la lectura", ["school_iep"]],
    ["preguntas sobre exenciones y apoyo económico", ["waivers_financial"]],
    ["estoy agotada y necesito un descanso", ["respite", "parent_support"]],
    ["apoyo para su hermana", ["sibling_support"]],
    ["necesitamos transporte para las citas", ["transportation"]],
    ["transición a la adultez y tutela", ["future_planning"]],
    ["clubes, deportes y recreación", ["recreation"]],
    ["no sé por dónde empezar", ["parent_support"]]
  ])("maps Spanish interview %s to the required domains", (text, expected) => {
    const profile = { ...morganFamilyState.profile!, birthYear: 2024, birthMonth: 1 };
    expect(
      extractFamilyInterviewMock(text, profile, new Date("2026-07-17T12:00:00Z"), "es").domains.map(
        ({ domain }) => domain
      )
    ).toEqual(expected);
  });

  it.each([
    ["speech and talking", ["early_intervention", "therapies"]],
    ["school IEP reading", ["school_iep"]],
    ["waiver money afford", ["waivers_financial"]],
    ["I need a break and feel exhausted and overwhelmed", ["respite", "parent_support"]],
    ["support for a sibling", ["sibling_support"]],
    ["a ride and transportation", ["transportation"]],
    ["adult transition, guardianship, and ABLE", ["future_planning"]],
    ["clubs, sports, and horses", ["recreation"]]
  ])("maps %s to the required domains", (text, expected) => {
    const profile = { ...morganFamilyState.profile!, birthYear: 2024, birthMonth: 1 };
    expect(extractFamilyInterviewMock(text, profile, new Date("2026-07-17T12:00:00Z")).domains.map(({ domain }) => domain)).toEqual(expected);
  });

  it("adds early intervention for a toddler speech concern but not for an older child", () => {
    const toddler = { ...morganFamilyState.profile!, birthYear: 2024, birthMonth: 8 };
    const older = { ...morganFamilyState.profile!, birthYear: 2017, birthMonth: 8 };

    expect(extractFamilyInterviewMock("My child has trouble talking.", toddler, new Date("2026-07-17T12:00:00Z")).domains.map(({ domain }) => domain)).toEqual([
      "early_intervention",
      "therapies"
    ]);
    expect(extractFamilyInterviewMock("My child has trouble talking.", older, new Date("2026-07-17T12:00:00Z")).domains.map(({ domain }) => domain)).toEqual(["therapies"]);
  });

  it("adds early intervention only for toddler speech or talking concerns, not therapy alone", () => {
    const toddler = { ...morganFamilyState.profile!, birthYear: 2024, birthMonth: 8 };
    const now = new Date("2026-07-17T12:00:00Z");

    expect(extractFamilyInterviewMock("We need physical therapy.", toddler, now).domains.map(({ domain }) => domain)).toEqual(["therapies"]);
    expect(extractFamilyInterviewMock("We need speech therapy.", toddler, now).domains.map(({ domain }) => domain)).toEqual([
      "early_intervention",
      "therapies"
    ]);
  });

  it("does not turn a concern into a diagnosis fact", () => {
    const result = extractFamilyInterviewMock("I wonder whether this could be autism.", morganFamilyState.profile!);
    expect(result.facts).toEqual([]);
  });

  it("extracts numeric grades and Oxford-comma diagnosis lists from explicit statements", () => {
    const result = extractFamilyInterviewMock(
      "My daughter is in 4th grade. She was diagnosed with dyslexia, ADHD, and autism.",
      morganFamilyState.profile!
    );
    expect(result.facts).toEqual([
      { label: "Grade", value: "4th grade", sourceSnippet: "4th grade" },
      {
        label: "Reported diagnosis",
        value: "dyslexia, ADHD, and autism",
        sourceSnippet: "She was diagnosed with dyslexia, ADHD, and autism"
      }
    ]);
  });

  it("extracts grade-number order and the profile child's explicit diagnosis without suffix collisions", () => {
    const profile = { ...morganFamilyState.profile!, childFirstName: "Riley" };
    expect(extractFamilyInterviewMock("Riley is in grade 4. Riley was diagnosed with dyslexia.", profile).facts).toEqual([
      { label: "Grade", value: "grade 4", sourceSnippet: "grade 4" },
      {
        label: "Reported diagnosis",
        value: "dyslexia",
        sourceSnippet: "Riley was diagnosed with dyslexia"
      }
    ]);
    expect(extractFamilyInterviewMock("NotRiley was diagnosed with dyslexia.", profile).facts).toEqual([]);
  });

  it("escapes punctuation in a profile child name before diagnosis matching", () => {
    const profile = { ...morganFamilyState.profile!, childFirstName: "Ri.ley" };
    expect(extractFamilyInterviewMock("Ri.ley was diagnosed with ADHD.", profile).facts).toEqual([
      {
        label: "Reported diagnosis",
        value: "ADHD",
        sourceSnippet: "Ri.ley was diagnosed with ADHD"
      }
    ]);
  });

  it("treats hyphenated child names as whole names instead of suffix matches", () => {
    const annProfile = { ...morganFamilyState.profile!, childFirstName: "Ann" };
    const joAnnProfile = { ...morganFamilyState.profile!, childFirstName: "Jo-Ann" };
    const text = "Jo-Ann was diagnosed with ADHD.";

    expect(extractFamilyInterviewMock(text, annProfile).facts).toEqual([]);
    expect(extractFamilyInterviewMock(text, joAnnProfile).facts).toEqual([
      {
        label: "Reported diagnosis",
        value: "ADHD",
        sourceSnippet: "Jo-Ann was diagnosed with ADHD"
      }
    ]);
  });
});

describe("family fact evidence", () => {
  it("marks only a nonempty case-sensitive verbatim substring as patient reported", () => {
    expect(familyFactStatus("fourth grade", "She is in fourth grade.")).toBe("patient_reported");
    expect(familyFactStatus("Fourth grade", "She is in fourth grade.")).toBe("inferred");
    expect(familyFactStatus("", "She is in fourth grade.")).toBe("inferred");
    expect(familyFactStatus("invented", "She is in fourth grade.")).toBe("inferred");
  });
});
