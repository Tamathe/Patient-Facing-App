import { describe, expect, it } from "vitest";
import { GAD7_INSTRUMENT } from "./gad7";

describe("GAD-7 instrument", () => {
  it("locks all seven authoritative English and U.S. Spanish items", () => {
    expect(GAD7_INSTRUMENT.items.map(({ en, es }) => ({ en, es }))).toEqual([
      { en: "Feeling nervous, anxious or on edge", es: "Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta" },
      { en: "Not being able to stop or control worrying", es: "No ha sido capaz de parar o controlar su preocupación" },
      { en: "Worrying too much about different things", es: "Se ha preocupado demasiado por motivos diferentes" },
      { en: "Trouble relaxing", es: "Ha tenido dificultad para relajarse" },
      { en: "Being so restless that it is hard to sit still", es: "Se ha sentido tan inquieto(a) que no ha podido quedarse quieto(a)" },
      { en: "Becoming easily annoyed or irritable", es: "Se ha molestado o irritado fácilmente" },
      { en: "Feeling afraid as if something awful might happen", es: "Ha tenido miedo de que algo terrible fuera a pasar" }
    ]);
    expect(GAD7_INSTRUMENT.defaultOptions).toEqual([
      { value: 0, en: "Not at all", es: "Ningún día" },
      { value: 1, en: "Several days", es: "Varios días" },
      { value: 2, en: "More than half the days", es: "Más de la mitad de los días" },
      { value: 3, en: "Nearly every day", es: "Casi todos los días" }
    ]);
  });

  it.each([
    [0, "minimal"],
    [4, "minimal"],
    [5, "mild"],
    [9, "mild"],
    [10, "moderate"],
    [14, "moderate"],
    [15, "severe"],
    [21, "severe"]
  ])("scores %i in the %s band", (total, band) => {
    const responses = Array(7).fill(0) as number[];
    for (let remaining = total, index = 0; remaining > 0; index += 1) {
      responses[index] = Math.min(3, remaining);
      remaining -= responses[index];
    }
    expect(GAD7_INSTRUMENT.score(responses)).toEqual({ totalScore: total, band });
  });
});
