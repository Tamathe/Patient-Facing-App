import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceIndicator } from "./voice-indicator";

describe("VoiceIndicator", () => {
  afterEach(() => {
    document.documentElement.lang = "en";
  });

  it("renders nothing while voice is idle", () => {
    const { container } = render(
      <VoiceIndicator listening={false} speaking={false} onStop={() => undefined} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows listening and lets the user stop", () => {
    const onStop = vi.fn();
    render(<VoiceIndicator listening speaking={false} onStop={onStop} />);

    expect(screen.getByRole("status")).toHaveTextContent("Listening…");
    fireEvent.click(screen.getByRole("button", { name: "Stop voice" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows the Spanish speaking state", () => {
    document.documentElement.lang = "es";
    render(<VoiceIndicator listening={false} speaking onStop={() => undefined} />);
    expect(screen.getByRole("status")).toHaveTextContent("Hablando…");
  });
});
