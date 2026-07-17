import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { HomeComposer } from "./home-composer";

const { push, classifyRouteRemote } = vi.hoisted(() => ({ push: vi.fn(), classifyRouteRemote: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/ai/route-classifier-client", () => ({ classifyRouteRemote }));
vi.mock("@/state/store", async () => {
  const { demoState } = await vi.importActual<typeof import("@/domain/fixtures")>("@/domain/fixtures");
  return { useHealthState: () => ({ state: demoState, dispatch: () => {} }) };
});

function type(value: string) {
  const input = screen.getByLabelText(/tell me what you need/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
}

beforeEach(() => {
  push.mockClear();
  classifyRouteRemote.mockReset();
  classifyRouteRemote.mockResolvedValue({ kind: "coach", confidence: 0 });
});

describe("HomeComposer", () => {
  it("routes a deterministic verb straight to the feature screen, no LLM call", async () => {
    render(<HomeComposer />);
    type("log my blood pressure");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/numbers"));
    expect(classifyRouteRemote).not.toHaveBeenCalled();
  });

  it("sends crisis text to the Coach and never to the LLM", async () => {
    render(<HomeComposer />);
    type("I want to die");
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining("/chat?ask=")));
    expect(classifyRouteRemote).not.toHaveBeenCalled();
  });

  it("sends a caregiver-voice crisis to the Coach and never to feature classification", async () => {
    render(<HomeComposer />);
    type("honestly she's been saying she wants to die");
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining("/chat?ask=")));
    expect(classifyRouteRemote).not.toHaveBeenCalled();
  });

  it("lets the live LLM upgrade a no-match to a navigate", async () => {
    classifyRouteRemote.mockResolvedValue({ kind: "navigate", href: "/plan", confidence: 0.9 });
    render(<HomeComposer />);
    type("just pick something helpful for me");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plan"));
    expect(classifyRouteRemote).toHaveBeenCalled();
  });

  it("falls back to the Coach when the LLM defers", async () => {
    classifyRouteRemote.mockResolvedValue({ kind: "coach", confidence: 0 });
    render(<HomeComposer />);
    type("just pick something helpful for me");
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining("/chat?ask=")));
  });

  it("routes a spoken transcript through the same safety-first router as typed text", async () => {
    type FakeResult = { results: Array<Array<{ transcript: string }>> };
    let instance: { onresult: ((event: FakeResult) => void) | null } | undefined;
    function FakeRecognition() {
      const rec = {
        lang: "",
        interimResults: false,
        maxAlternatives: 1,
        onresult: null as ((event: FakeResult) => void) | null,
        onerror: null as (() => void) | null,
        onend: null as (() => void) | null,
        start() {},
        stop() {}
      };
      instance = rec;
      return rec;
    }
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;
    try {
      render(<HomeComposer />);
      const mic = await screen.findByRole("button", { name: /speak to the assistant/i });
      fireEvent.click(mic);
      instance?.onresult?.({ results: [[{ transcript: "log my blood pressure" }]] });
      await waitFor(() => expect(push).toHaveBeenCalledWith("/numbers"));
    } finally {
      delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    }
  });
});
