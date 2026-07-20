import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadAloud } from "./read-aloud";

const tts = vi.hoisted(() => ({
  resolve: null as (() => void) | null,
  speak: vi.fn(() => new Promise<void>((resolve) => {
    tts.resolve = resolve;
  })),
  stopSpeaking: vi.fn()
}));

vi.mock("./tts", () => ({ speak: tts.speak, stopSpeaking: tts.stopSpeaking }));

describe("ReadAloud", () => {
  beforeEach(() => {
    tts.resolve = null;
    tts.speak.mockClear();
    tts.stopSpeaking.mockClear();
  });

  it("toggles speech with the correct language and stops on unmount", async () => {
    const { unmount } = render(<ReadAloud text="Revisa tu plan" language="es" />);
    const button = screen.getByRole("button", { name: "Leer en voz alta" });

    fireEvent.click(button);
    expect(tts.speak).toHaveBeenCalledWith("Revisa tu plan", { language: "es" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(tts.stopSpeaking).toHaveBeenCalledTimes(1);
    await act(async () => tts.resolve?.());

    fireEvent.click(button);
    unmount();
    expect(tts.stopSpeaking).toHaveBeenCalledTimes(2);
  });
});
