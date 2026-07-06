import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { HomeComposer } from "./home-composer";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/state/store", async () => {
  const { demoState } = await vi.importActual<typeof import("@/domain/fixtures")>("@/domain/fixtures");
  return { useHealthState: () => ({ state: demoState, dispatch: () => {} }) };
});

function type(value: string) {
  const input = screen.getByLabelText(/tell me what you need/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
}

describe("HomeComposer", () => {
  it("routes a deterministic verb straight to the feature screen", () => {
    push.mockClear();
    render(<HomeComposer />);
    type("log my blood pressure");
    expect(push).toHaveBeenCalledWith("/numbers");
  });

  it("hands crisis text to the Coach through the safety gate, never a feature screen", () => {
    push.mockClear();
    render(<HomeComposer />);
    type("I want to die");
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/chat?ask="));
  });

  it("hands a genuine question to the Coach", () => {
    push.mockClear();
    render(<HomeComposer />);
    type("why does my medicine matter if I feel fine?");
    const call = push.mock.calls[0]?.[0] as string;
    expect(call.startsWith("/chat?ask=")).toBe(true);
  });
});
