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
});
