import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckinPage from "./page";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  speak: vi.fn(() => Promise.resolve())
}));

vi.mock("@/state/store", async () => {
  const { demoState } = await vi.importActual<typeof import("@/domain/fixtures")>("@/domain/fixtures");
  return { useHealthState: () => ({ state: demoState, dispatch: mocks.dispatch }) };
});
vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/phq9-check-in", () => ({
  Phq9CheckIn: ({ onComplete }: { onComplete: (responses: number[]) => void }) => (
    <button type="button" onClick={() => onComplete([0, 0, 0, 0, 0, 0, 0, 0, 3])}>spoken item nine</button>
  )
}));
vi.mock("@/voice/tts", () => ({ speak: mocks.speak }));

describe("CheckinPage crisis speech", () => {
  beforeEach(() => {
    mocks.dispatch.mockClear();
    mocks.speak.mockClear();
  });

  it("uses the existing item-9 crisis path and speaks the rendered copy at rate 0.9", async () => {
    render(<CheckinPage />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "spoken item nine" })));

    expect(screen.getByText(/immediate danger/i)).toBeInTheDocument();
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "addAssessmentEvent" }));
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "addAiMessage" }));
    expect(mocks.speak).toHaveBeenCalledWith(expect.stringMatching(/immediate danger/i), {
      language: "en",
      rate: 0.9
    });
  });
});
