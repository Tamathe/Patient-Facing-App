import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { TeachableMomentCard } from "./teachable-moment-card";

describe("TeachableMomentCard", () => {
  it("bridges the eye result to daily diabetes care with CTAs into existing surfaces", () => {
    render(<TeachableMomentCard language="en" />);

    expect(
      screen.getByText("The same blood sugar that affects your eyes responds to daily care. Small steps protect your sight.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /My Blood Sugar/ })).toHaveAttribute("href", "/glucose");
    expect(screen.getByRole("link", { name: /Check a food/ })).toHaveAttribute("href", "/food");
    expect(screen.getByRole("link", { name: /My medicines/ })).toHaveAttribute("href", "/medicines");
  });

  it("renders the Spanish bridge with equal weight", () => {
    render(<TeachableMomentCard language="es" />);

    expect(screen.getByText(/La misma azúcar en sangre que afecta tus ojos/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mi Azúcar en Sangre/ })).toHaveAttribute("href", "/glucose");
  });
});
