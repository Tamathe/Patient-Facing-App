import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";
import type { HealthAction } from "@/state/store";
import { DraftPanel } from "./draft-panel";

const mocks = vi.hoisted(() => ({
  active: null as ((text: string) => void) | null,
  dispatch: vi.fn(),
  push: vi.fn(),
  speak: vi.fn(() => Promise.resolve()),
  start: vi.fn(),
  stop: vi.fn(),
  stopSpeaking: vi.fn(),
  state: null as AppState | null
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/state/store", () => ({
  useHealthState: () => ({ state: mocks.state, dispatch: mocks.dispatch })
}));
vi.mock("./use-dictation", () => ({
  useDictation: ({ onFinalTranscript }: { onFinalTranscript: (text: string) => void }) => ({
    supported: true,
    listening: false,
    start: () => {
      mocks.active = onFinalTranscript;
      mocks.start();
    },
    stop: mocks.stop
  })
}));
vi.mock("./voice-consent", () => ({
  useVoiceEntry: () => ({ consentRequired: false, grantConsent: vi.fn(), onSessionStart: vi.fn() })
}));
vi.mock("./tts", () => ({
  isSpeaking: () => false,
  speak: mocks.speak,
  stopSpeaking: mocks.stopSpeaking,
  subscribeSpeaking: () => () => undefined
}));

function applyAction(action: HealthAction): void {
  const state = mocks.state as AppState;
  if (action.type === "addContextItem") {
    mocks.state = {
      ...state,
      contextItems: [...state.contextItems, action.item],
      extractedFacts: [...state.extractedFacts, ...action.facts]
    };
  } else if (action.type === "confirmFact") {
    mocks.state = {
      ...state,
      extractedFacts: state.extractedFacts.map((fact) => fact.id === action.factId ? { ...fact, status: "confirmed" } : fact)
    };
  } else if (action.type === "removeContextItem") {
    mocks.state = {
      ...state,
      contextItems: state.contextItems.filter((item) => item.id !== action.contextItemId),
      extractedFacts: state.extractedFacts.filter((fact) => fact.contextItemId !== action.contextItemId)
    };
  }
}

async function openAndSay(text: string): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Talk through your plan" }));
  fireEvent.click(screen.getByRole("button", { name: "Add a spoken plan note" }));
  await act(async () => mocks.active?.(text));
}

beforeEach(() => {
  mocks.active = null;
  mocks.state = { ...demoState, contextItems: [], extractedFacts: [] };
  mocks.dispatch.mockReset();
  mocks.dispatch.mockImplementation(applyAction);
  mocks.push.mockClear();
  mocks.speak.mockClear();
  mocks.start.mockClear();
  mocks.stop.mockClear();
  mocks.stopSpeaking.mockClear();
});

describe("DraftPanel", () => {
  it("stages deterministic facts with provenance and never confirms without a tap", async () => {
    const { rerender } = render(<DraftPanel />);
    await openAndSay("Check blood pressure every morning and continue lisinopril as prescribed.");

    const staged = mocks.dispatch.mock.calls.find(([action]) => action.type === "addContextItem")?.[0] as Extract<HealthAction, { type: "addContextItem" }>;
    expect(staged.item).toMatchObject({ title: "Voice note 1", sourceLabel: "Spoken plan note" });
    expect(staged.facts).toHaveLength(2);
    expect(staged.facts.every((fact) => fact.status === "needs_review")).toBe(true);
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "confirmFact" }));
    expect(screen.getAllByText(/Check blood pressure every morning/).length).toBeGreaterThan(0);
    expect(mocks.speak).toHaveBeenCalledWith(
      "I noted 2 items: Home monitoring, Medication instruction. Tap confirm on any to add it to your plan.",
      { language: "en" }
    );

    rerender(<DraftPanel />);
    expect(screen.getByText(staged.item.id)).toBeInTheDocument();
    expect(screen.getAllByText(staged.facts[0].sourceSnippet).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /Confirm Home monitoring/ })[0]);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "confirmFact", factId: staged.facts[0].id });
  });

  it("redirects safety and crisis speech before storing anything", async () => {
    render(<DraftPanel />);
    await openAndSay("I want to die");
    expect(mocks.push).toHaveBeenCalledWith("/chat?ask=I%20want%20to%20die");
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "addContextItem" }));
  });

  it("reprompts for a short transcript and does not dispatch", async () => {
    render(<DraftPanel />);
    await openAndSay("BP now");
    expect(mocks.speak).toHaveBeenCalledWith("Please say a little more so I can make a useful plan note.", { language: "en" });
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "addContextItem" }));
  });

  it("refuses voice undo after confirmation but allows the explicit Undo tap", async () => {
    const view = render(<DraftPanel />);
    await openAndSay("Check blood pressure every morning.");
    const staged = mocks.dispatch.mock.calls.find(([action]) => action.type === "addContextItem")?.[0] as Extract<HealthAction, { type: "addContextItem" }>;
    view.rerender(<DraftPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Confirm Home monitoring/ }));
    view.rerender(<DraftPanel />);

    mocks.dispatch.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Add a spoken plan note" }));
    await act(async () => mocks.active?.("undo that"));
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "removeContextItem" }));
    expect(mocks.speak).toHaveBeenCalledWith(
      "That note has a confirmed item. Use the Undo button if you still want to remove it.",
      { language: "en" }
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo last note" }));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "removeContextItem", contextItemId: staged.item.id });
  });

  it("reads back staged and confirmed items and ships Spanish controls", async () => {
    mocks.state = {
      ...demoState,
      patient: { ...demoState.patient, language: "es" },
      contextItems: [],
      extractedFacts: [
        {
          id: "confirmed-1",
          contextItemId: "existing",
          label: "Medicamento",
          value: "Tomar medicina según lo indicado",
          confidence: "high",
          status: "confirmed",
          sourceSnippet: "continúe su medicina"
        }
      ]
    };
    render(<DraftPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Hablar sobre tu plan" }));
    expect(screen.getByRole("button", { name: "Agregar una nota hablada al plan" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leer borrador" }));
    expect(mocks.speak).toHaveBeenCalledWith(expect.stringContaining("Tomar medicina según lo indicado"), { language: "es" });
  });
});
