import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { LanguageToggle } from "./language-toggle";

describe("LanguageToggle", () => {
  it("marks the active language and switches on tap", () => {
    const onChange = vi.fn();

    render(<LanguageToggle language="en" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(onChange).toHaveBeenCalledWith("es");
  });

  it("shows the demo-grade Spanish note only while Spanish is active", () => {
    const { rerender } = render(<LanguageToggle language="es" onChange={() => undefined} />);

    expect(screen.getByText(/pendiente de revisión/i)).toBeInTheDocument();

    rerender(<LanguageToggle language="en" onChange={() => undefined} />);

    expect(screen.queryByText(/pendiente de revisión/i)).not.toBeInTheDocument();
  });

  it("drops the label and note in compact mode but keeps the accessible group name", () => {
    render(<LanguageToggle compact language="es" onChange={() => undefined} />);

    expect(screen.getByRole("group", { name: "Language / Idioma" })).toBeInTheDocument();
    expect(screen.queryByText(/pendiente de revisión/i)).not.toBeInTheDocument();
  });
});
