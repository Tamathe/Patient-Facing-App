import { describe, expect, it } from "vitest";
import {
  PHQ9_CONSENT,
  PHQ9_ITEMS,
  phq9Item9IsPositive,
  scorePhq9,
  severityBandSummary
} from "./assessment";
import { getInstrument, INSTRUMENTS, isKnownInstrument } from "./instruments/registry";
import { PHQ9_INSTRUMENT } from "./instruments/phq9";

const EXPECTED_PHQ9_ITEMS = [
  {
    id: "phq9_1",
    en: "Little interest or pleasure in doing things",
    es: "Poco interés o placer en hacer las cosas"
  },
  {
    id: "phq9_2",
    en: "Feeling down, depressed, or hopeless",
    es: "Sentirse desanimado/a, deprimido/a o sin esperanza"
  },
  {
    id: "phq9_3",
    en: "Trouble falling or staying asleep, or sleeping too much",
    es: "Problemas para dormir o quedarse dormido/a, o dormir demasiado"
  },
  {
    id: "phq9_4",
    en: "Feeling tired or having little energy",
    es: "Sentirse cansado/a o con poca energía"
  },
  { id: "phq9_5", en: "Poor appetite or overeating", es: "Poco apetito o comer en exceso" },
  {
    id: "phq9_6",
    en: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    es: "Sentirse mal consigo mismo/a — o sentir que es un fracaso o que ha decepcionado a su familia o a sí mismo/a"
  },
  {
    id: "phq9_7",
    en: "Trouble concentrating on things, such as reading the newspaper or watching television",
    es: "Dificultad para concentrarse en cosas, como leer el periódico o ver televisión"
  },
  {
    id: "phq9_8",
    en: "Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual",
    es: "Moverse o hablar tan despacio que otras personas lo podrían haber notado — o estar tan inquieto/a que se ha movido mucho más de lo normal"
  },
  {
    id: "phq9_9",
    en: "Thoughts that you would be better off dead, or of hurting yourself in some way",
    es: "Pensamientos de que estaría mejor muerto/a o de hacerse daño de alguna manera"
  }
];

const EXPECTED_PHQ9_OPTIONS = [
  { value: 0, en: "Not at all", es: "Para nada" },
  { value: 1, en: "Several days", es: "Varios días" },
  { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
  { value: 3, en: "Nearly every day", es: "Casi todos los días" }
];

const EXPECTED_PHQ9_CONSENT = {
  en: {
    title: "Before you start this check-in",
    points: [
      "This is a short self-check about your mood over the last two weeks. It is not a diagnosis and it is not crisis care or therapy.",
      "A check-in can miss things, so trust yourself — if something feels wrong, reach out to a person.",
      "If you are thinking about hurting yourself, help is one tap away: you can call or text 988 any time."
    ],
    acknowledge: "I understand — start the check-in"
  },
  es: {
    title: "Antes de comenzar este cuestionario",
    points: [
      "Este es un breve autochequeo sobre tu ánimo en las últimas dos semanas. No es un diagnóstico y no es atención de crisis ni terapia.",
      "Un chequeo puede pasar cosas por alto, así que confía en ti — si algo se siente mal, comunícate con una persona.",
      "Si estás pensando en hacerte daño, la ayuda está a un toque: puedes llamar o enviar un texto al 988 en cualquier momento."
    ],
    acknowledge: "Entiendo — comenzar el cuestionario"
  }
};

const EXPECTED_PHQ9_BAND_SUMMARIES = {
  minimal: {
    en: "Your answers suggest few or no signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
    es: "Tus respuestas sugieren pocas o ninguna señal esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
  },
  mild: {
    en: "Your answers suggest some mild signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
    es: "Tus respuestas sugieren algunas señales leves esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
  },
  moderate: {
    en: "Your answers suggest a moderate level of signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
    es: "Tus respuestas sugieren un nivel moderado de señales esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
  },
  moderately_severe: {
    en: "Your answers suggest a fairly high level of signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
    es: "Tus respuestas sugieren un nivel bastante alto de señales esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
  },
  severe: {
    en: "Your answers suggest a high level of signs this week. This is a self-check, not a diagnosis. Sharing it with your care team can help.",
    es: "Tus respuestas sugieren un nivel alto de señales esta semana. Este es un autochequeo, no un diagnóstico. Compartirlo con tu equipo de salud puede ayudar."
  }
};

describe("scorePhq9", () => {
  it("sums responses and maps to published PHQ-9 severity bands", () => {
    expect(scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual({ totalScore: 0, severityBand: "minimal" });
    expect(scorePhq9([1, 1, 1, 1, 1, 0, 0, 0, 0])).toEqual({ totalScore: 5, severityBand: "mild" });
    expect(scorePhq9([2, 2, 2, 1, 1, 1, 1, 0, 0])).toEqual({ totalScore: 10, severityBand: "moderate" });
    expect(scorePhq9([2, 2, 2, 2, 2, 2, 2, 1, 0])).toEqual({ totalScore: 15, severityBand: "moderately_severe" });
    expect(scorePhq9([3, 3, 3, 3, 3, 3, 3, 3, 3])).toEqual({ totalScore: 27, severityBand: "severe" });
  });
});

describe("phq9Item9IsPositive", () => {
  it("flags any non-zero item-9 as a crisis signal regardless of total", () => {
    expect(phq9Item9IsPositive([0, 0, 0, 0, 0, 0, 0, 0, 1])).toBe(true);
    // Item-9 positive with a minimal total (total = 1) still routes to crisis.
    expect(scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 1])).toEqual({ totalScore: 1, severityBand: "minimal" });
  });

  it("does not flag a high total when item-9 is zero", () => {
    const responses = [3, 3, 3, 3, 3, 3, 3, 3, 0];
    expect(phq9Item9IsPositive(responses)).toBe(false);
    expect(scorePhq9(responses).severityBand).toBe("severe");
  });
});

describe("severityBandSummary", () => {
  it("returns non-diagnostic plain-language copy in both languages", () => {
    const en = severityBandSummary("moderate", "en");
    const es = severityBandSummary("moderate", "es");
    expect(en).toContain("not a diagnosis");
    expect(es).toContain("no un diagnóstico");
    expect(en).not.toMatch(/depression|disorder|diagnosed with/i);
  });
});

describe("PHQ-9 content parity", () => {
  it("defines every item and consent point in English and Spanish", () => {
    expect(PHQ9_ITEMS).toHaveLength(9);
    for (const item of PHQ9_ITEMS) {
      expect(item.en.length).toBeGreaterThan(0);
      expect(item.es.length).toBeGreaterThan(0);
    }
    expect(PHQ9_CONSENT.en.points.length).toBe(PHQ9_CONSENT.es.points.length);
    expect(PHQ9_CONSENT.en.points.join(" ")).toContain("988");
    expect(PHQ9_CONSENT.es.points.join(" ")).toContain("988");
  });

  it("ports the existing PHQ-9 content and scoring into the registry without wording changes", () => {
    expect(PHQ9_INSTRUMENT.items.map(({ id, en, es }) => ({ id, en, es }))).toEqual(EXPECTED_PHQ9_ITEMS);
    expect(PHQ9_INSTRUMENT.defaultOptions).toEqual(EXPECTED_PHQ9_OPTIONS);
    expect(PHQ9_INSTRUMENT.consent).toEqual(EXPECTED_PHQ9_CONSENT);
    expect(PHQ9_INSTRUMENT.bands).toEqual(["minimal", "mild", "moderate", "moderately_severe", "severe"]);
    expect(PHQ9_INSTRUMENT.bandSummaries).toEqual(EXPECTED_PHQ9_BAND_SUMMARIES);
    expect(
      [4, 5, 9, 10, 14, 15, 19, 20].map((totalScore) =>
        PHQ9_INSTRUMENT.score([totalScore, 0, 0, 0, 0, 0, 0, 0, 0]).band
      )
    ).toEqual(["minimal", "mild", "mild", "moderate", "moderate", "moderately_severe", "moderately_severe", "severe"]);
    expect(PHQ9_INSTRUMENT.items[8].crisisOnPositive).toBe(true);
    expect(PHQ9_INSTRUMENT.recurrenceDays).toBe(14);
    expect(PHQ9_INSTRUMENT.wordingVerified).toBe(true);
    expect(PHQ9_INSTRUMENT.licenseStatus).toBe("clear");
    expect(PHQ9_ITEMS).toEqual(EXPECTED_PHQ9_ITEMS);
    expect(PHQ9_CONSENT).toEqual(EXPECTED_PHQ9_CONSENT);
  });
});

describe("instrument registry", () => {
  it("exposes one internally consistent source of truth", () => {
    expect(Object.keys(INSTRUMENTS)).toEqual([
      "phq9",
      "phq2",
      "gad2",
      "gad7",
      "hunger_vital_sign",
      "tobacco_use",
      "nida_single",
      "lung_ldct_eligibility",
      "crc_eligibility",
      "prediabetes_risk",
      "audit_c",
      "dds2",
      "steadi3"
    ]);
    expect(getInstrument("phq9")).toBe(PHQ9_INSTRUMENT);
    expect(getInstrument("missing")).toBeUndefined();
    expect(isKnownInstrument("phq9")).toBe(true);
    expect(isKnownInstrument("missing")).toBe(false);

    for (const [id, instrument] of Object.entries(INSTRUMENTS)) {
      expect(instrument.id).toBe(id);
      expect(new Set(instrument.items.map((item) => item.id)).size).toBe(instrument.items.length);
      expect(new Set(instrument.bands).size).toBe(instrument.bands.length);
      expect(Object.keys(instrument.bandSummaries).sort()).toEqual([...instrument.bands].sort());
      expect(instrument.consent.en.points).toHaveLength(instrument.consent.es.points.length);
    }
  });

  it.each(["constructor", "toString", "__proto__"])(
    "rejects inherited Object prototype key %s",
    (instrumentId) => {
      expect(getInstrument(instrumentId)).toBeUndefined();
      expect(isKnownInstrument(instrumentId)).toBe(false);
    }
  );
});
