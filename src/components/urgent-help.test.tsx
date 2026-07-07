import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { UrgentHelp } from "./urgent-help";

describe("UrgentHelp", () => {
  it("shows crisis actions without a collapsed disclosure gate", () => {
    render(<UrgentHelp />);

    expect(document.querySelector("details")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /crisis lifeline/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /911/i })).toBeVisible();
  });

  it("offers offline-safe 988/911 deep links with no dependency on a clinic number", () => {
    render(<UrgentHelp />);

    expect(screen.getByRole("link", { name: /988 — crisis lifeline/i })).toHaveAttribute("href", "tel:988");
    expect(screen.getByRole("link", { name: /text 988/i })).toHaveAttribute("href", "sms:988");
    expect(screen.getByRole("link", { name: /911/i })).toHaveAttribute("href", "tel:911");
  });

  it("localizes the summary", () => {
    render(<UrgentHelp language="es" />);
    expect(screen.getByText(/busca ayuda/i)).toBeInTheDocument();
  });
});
