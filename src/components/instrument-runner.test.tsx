import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { ScreeningInstrument } from "@/domain/instruments/types";
import { InstrumentRunner } from "./instrument-runner";

const CONDITIONAL_INSTRUMENT: ScreeningInstrument = {
  id: "conditional-demo",
  title: { en: "Conditional demo", es: "Demostración condicional" },
  audience: "self",
  tier: 1,
  items: [
    { id: "need", kind: "choice", en: "Do you need help?", es: "¿Necesitas ayuda?" },
    {
      id: "days",
      kind: "number",
      en: "How many days?",
      es: "¿Cuántos días?",
      min: 0,
      max: 7,
      conditionalOn: { itemId: "need", atLeast: 1 },
      notApplicableValue: -1
    }
  ],
  defaultOptions: [
    { value: 0, en: "No", es: "No" },
    { value: 1, en: "Yes", es: "Sí" }
  ],
  score: (responses) => ({ totalScore: responses[0], band: responses[0] > 0 ? "positive" : "negative" }),
  bands: ["negative", "positive"],
  bandSummaries: {
    negative: { en: "No need reported.", es: "No se informó ninguna necesidad." },
    positive: { en: "A need was reported.", es: "Se informó una necesidad." }
  },
  consent: {
    en: { title: "Before you start", points: ["This is optional."], acknowledge: "Continue" },
    es: { title: "Antes de comenzar", points: ["Esto es opcional."], acknowledge: "Continuar" }
  },
  wordingVerified: false,
  licenseStatus: "pending",
  attribution: { en: "Demo source", es: "Fuente de demostración" }
};

const MULTI_INSTRUMENT: ScreeningInstrument = {
  ...CONDITIONAL_INSTRUMENT,
  id: "multi-demo",
  title: { en: "Multi demo", es: "Demostración múltiple" },
  audience: "caregiver",
  items: [
    {
      id: "activities",
      kind: "multi_choice",
      allowEmpty: true,
      en: "Choose every activity that applies.",
      es: "Elige todas las actividades que correspondan.",
      options: [
        { value: 1, en: "Reading", es: "Leer", score: 0 },
        { value: 2, en: "Running", es: "Correr", score: 1 },
        { value: 4, en: "Drawing", es: "Dibujar", score: 0 }
      ]
    }
  ]
};

describe("InstrumentRunner", () => {
  it("gates the form behind consent and emits a conditional sentinel for a skipped item", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<InstrumentRunner instrument={CONDITIONAL_INSTRUMENT} language="en" onComplete={onComplete} />);

    expect(screen.queryByText("Do you need help?")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getAllByText("Please answer every question.")).toHaveLength(1);

    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(screen.queryByRole("spinbutton", { name: "How many days?" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onComplete).toHaveBeenCalledWith([0, -1]);
  });

  it("renders accessible number fields and requires visible conditional answers", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<InstrumentRunner instrument={CONDITIONAL_INSTRUMENT} language="en" onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    const number = screen.getByRole("spinbutton", { name: "How many days?" });
    expect(number).toHaveAttribute("min", "0");
    expect(number).toHaveAttribute("max", "7");
    await user.type(number, "3");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onComplete).toHaveBeenCalledWith([1, 3]);
  });

  it("uses inclusive lower and upper condition bounds for an equality-only item", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const equalityInstrument: ScreeningInstrument = {
      ...CONDITIONAL_INSTRUMENT,
      id: "equality-demo",
      items: [
        CONDITIONAL_INSTRUMENT.items[0],
        {
          ...CONDITIONAL_INSTRUMENT.items[1],
          conditionalOn: { itemId: "need", atLeast: 0, atMost: 0 }
        }
      ]
    };
    render(<InstrumentRunner instrument={equalityInstrument} language="en" onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(screen.getByRole("spinbutton", { name: "How many days?" })).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    expect(screen.queryByRole("spinbutton", { name: "How many days?" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onComplete).toHaveBeenCalledWith([1, -1]);
  });

  it("rejects a fractional response for a whole-number item", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const integerInstrument: ScreeningInstrument = {
      ...CONDITIONAL_INSTRUMENT,
      id: "integer-demo",
      items: [
        {
          id: "count",
          kind: "number",
          en: "Whole-number count",
          es: "Cantidad entera",
          min: 0,
          max: 365,
          integer: true
        }
      ]
    };
    render(<InstrumentRunner instrument={integerInstrument} language="en" onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    const input = screen.getByRole("spinbutton", { name: "Whole-number count" });
    expect(input).toHaveAttribute("step", "1");
    await user.type(input, "1.5");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please answer every question.");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("shows localized draft and license warnings plus attribution", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <InstrumentRunner instrument={CONDITIONAL_INSTRUMENT} language="en" onComplete={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByText("Draft wording — verify against the official form before clinical use.")
    ).toBeVisible();
    expect(
      screen.getByText("Demo preview — not for clinical use until the electronic-use agreement is in place.")
    ).toBeVisible();
    unmount();

    render(<InstrumentRunner instrument={CONDITIONAL_INSTRUMENT} language="es" onComplete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText(/Borrador.*formulario oficial/i)).toBeVisible();
    expect(screen.getByText(/Vista previa.*clínic/i)).toBeVisible();
    expect(screen.getByText("Fuente de demostración")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Sí" }).closest("label")).toHaveClass("min-h-12");
  });

  it("renders generic caregiver and teen framing with named and fallback children in both languages", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <InstrumentRunner
        childName="Avery"
        instrument={MULTI_INSTRUMENT}
        language="en"
        onComplete={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Answer about Avery.")).toBeVisible();

    rerender(
      <InstrumentRunner instrument={MULTI_INSTRUMENT} language="es" onComplete={vi.fn()} />
    );
    expect(screen.getByText("Responde sobre tu hijo o hija.")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Leer" })).toBeVisible();

    const teenInstrument: ScreeningInstrument = { ...CONDITIONAL_INSTRUMENT, audience: "teen" };
    rerender(
      <InstrumentRunner childName="Avery" instrument={teenInstrument} language="en" onComplete={vi.fn()} />
    );
    expect(screen.getByText(/Hand the device to Avery.*for your teen to answer themselves/i)).toBeVisible();

    rerender(
      <InstrumentRunner instrument={teenInstrument} language="es" onComplete={vi.fn()} />
    );
    expect(screen.getByText(/Dale el dispositivo a tu adolescente.*responda por sí mismo/i)).toBeVisible();
  });

  it("submits untouched and fully cleared allow-empty multi-choice rows as numeric zero", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { unmount } = render(
      <InstrumentRunner instrument={MULTI_INSTRUMENT} language="en" onComplete={onComplete} />
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).toHaveBeenLastCalledWith([0]);
    unmount();

    render(<InstrumentRunner instrument={MULTI_INSTRUMENT} language="en" onComplete={onComplete} />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "Reading" }));
    await user.click(screen.getByRole("checkbox", { name: "Running" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).toHaveBeenLastCalledWith([3]);
    await user.click(screen.getByRole("checkbox", { name: "Reading" }));
    await user.click(screen.getByRole("checkbox", { name: "Running" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).toHaveBeenLastCalledWith([0]);
  });

  it.each([2 ** 32, 2 ** 32 + 1, 2 ** 40 + 8])(
    "rejects a high undeclared multi-choice mask of %s",
    async (mask) => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(
        <InstrumentRunner
          initialResponses={{ activities: mask }}
          instrument={MULTI_INSTRUMENT}
          language="en"
          onComplete={onComplete}
        />
      );

      await user.click(screen.getByRole("button", { name: "Continue" }));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Please answer every question.");
      expect(onComplete).not.toHaveBeenCalled();
    }
  );
});
