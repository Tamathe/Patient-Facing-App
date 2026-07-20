import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";
import { QuickCheck } from "./quick-check";

const { context, responseByInstrument } = vi.hoisted(() => ({
  context: { state: {} as AppState, dispatch: vi.fn() },
  responseByInstrument: {} as Record<string, number[]>
}));

vi.mock("@/state/store", () => ({ useHealthState: () => context }));
vi.mock("./instrument-runner", () => ({
  InstrumentRunner: ({ instrument, onComplete }: { instrument: { id: string }; onComplete: (responses: number[]) => void }) => (
    <button onClick={() => onComplete(responseByInstrument[instrument.id])} type="button">
      Submit {instrument.id}
    </button>
  )
}));
vi.mock("./instrument-result", () => ({
  InstrumentResult: ({ instrument }: { instrument: { id: string } }) => <section>Result {instrument.id}</section>
}));

async function submitAndContinue(user: ReturnType<typeof userEvent.setup>, instrumentId: string): Promise<void> {
  await user.click(screen.getByRole("button", { name: `Submit ${instrumentId}` }));
  expect(screen.getByText(`Result ${instrumentId}`)).toBeVisible();
  await user.click(screen.getByRole("button", { name: /Continue|Continuar/ }));
}

async function completeCoreBattery(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await submitAndContinue(user, "phq2");
  await submitAndContinue(user, "gad2");
  await submitAndContinue(user, "hunger_vital_sign");
  await submitAndContinue(user, "tobacco_use");
  await submitAndContinue(user, "nida_single");
}

describe("QuickCheck", () => {
  beforeEach(() => {
    context.state = demoState;
    context.dispatch.mockReset();
    Object.assign(responseByInstrument, {
      phq2: [0, 0],
      phq9: Array(9).fill(0),
      gad2: [0, 0],
      gad7: Array(7).fill(0),
      hunger_vital_sign: [0, 0],
      tobacco_use: [0, 0],
      nida_single: [0]
    });
  });

  it("renders each result before advancing and inserts positive expansions", async () => {
    const user = userEvent.setup();
    responseByInstrument.phq2 = [3, 0];
    responseByInstrument.gad2 = [1, 2];
    render(<QuickCheck />);

    expect(screen.getByText("Check 1 of 5")).toBeVisible();
    expect(screen.getByRole("link", { name: "Exit anytime" })).toHaveAttribute("href", "/checkin");
    await user.click(screen.getByRole("button", { name: "Submit phq2" }));
    expect(screen.getByText("Result phq2")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Submit phq9" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Submit phq9" })).toBeVisible();
    await submitAndContinue(user, "phq9");
    await user.click(screen.getByRole("button", { name: "Submit gad2" }));
    expect(screen.getByText("Result gad2")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Submit gad7" })).toBeVisible();
    await submitAndContinue(user, "gad7");
    expect(screen.getByText("Check 3 of 5")).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit hunger_vital_sign" })).toBeVisible();
  });

  it("finishes an all-negative path with the locked non-diagnostic copy", async () => {
    const user = userEvent.setup();
    render(<QuickCheck />);

    await completeCoreBattery(user);

    expect(
      screen.getByText("Nothing you reported needs follow-up today. This is a check-in, not a diagnosis.")
    ).toBeVisible();
    expect(screen.queryByText("Kentucky food resources")).not.toBeInTheDocument();
  });

  it("shows positive cards in tier order, Kentucky food resources, insulin safety, and privacy copy", async () => {
    const user = userEvent.setup();
    responseByInstrument.hunger_vital_sign = [1, 0];
    responseByInstrument.tobacco_use = [2, -1];
    responseByInstrument.nida_single = [1];
    context.state = {
      ...demoState,
      patient: { ...demoState.patient, county: "Perry" },
      medications: [{ ...demoState.medications[0], name: "Insulin glargine" }]
    };
    render(<QuickCheck />);

    await completeCoreBattery(user);

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Kentucky food resources", "Quit Now Kentucky", "Talk with your care team"]);
    expect(screen.getByText("Perry County food resources")).toBeVisible();
    expect(screen.getByText(/food access can make low blood sugar more likely/i)).toBeVisible();
    expect(screen.getByText("1-800-QUIT-NOW")).toBeVisible();
    expect(screen.getByRole("link", { name: "4 quick questions" })).toHaveAttribute(
      "href",
      "/checkin/lung_ldct_eligibility"
    );
    expect(screen.queryByText("Coming next")).not.toBeInTheDocument();
    expect(screen.getByText("Your answers stay on this device. You choose if and when to share them.")).toBeVisible();
  });

  it("does not show the insulin note for metformin alone and enables the lung link when P2 registers it", async () => {
    const user = userEvent.setup();
    responseByInstrument.hunger_vital_sign = [0, 1];
    responseByInstrument.tobacco_use = [1, -1];
    context.state = {
      ...demoState,
      medications: [{ ...demoState.medications[0], name: "Metformin" }]
    };
    render(<QuickCheck />);

    await completeCoreBattery(user);

    expect(screen.queryByText(/food access can make low blood sugar more likely/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "4 quick questions" })).toHaveAttribute(
      "href",
      "/checkin/lung_ldct_eligibility"
    );
  });

  it("provides Spanish progress, exit, completion, lung-link, and privacy parity", async () => {
    const user = userEvent.setup();
    responseByInstrument.tobacco_use = [1, -1];
    responseByInstrument.nida_single = [2];
    context.state = { ...demoState, patient: { ...demoState.patient, language: "es" } };
    render(<QuickCheck />);

    expect(screen.getByText("Chequeo 1 de 5")).toBeVisible();
    expect(screen.getByRole("link", { name: "Salir en cualquier momento" })).toHaveAttribute("href", "/checkin");
    await completeCoreBattery(user);
    expect(screen.getByRole("link", { name: "4 preguntas rápidas" })).toHaveAttribute(
      "href",
      "/checkin/lung_ldct_eligibility"
    );
    expect(screen.getByText("Tus respuestas permanecen en este dispositivo. Tú eliges si las compartes y cuándo.")).toBeVisible();
  });
});
