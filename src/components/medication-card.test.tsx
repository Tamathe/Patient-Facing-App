import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import { MedicationCard } from "./medication-card";

describe("MedicationCard", () => {
  it("shows purpose and captures a barrier", async () => {
    const user = userEvent.setup();
    const onBarriersChange = vi.fn();

    render(<MedicationCard medication={demoState.medications[0]} onBarriersChange={onBarriersChange} />);

    expect(screen.getByText("Helps lower blood pressure.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("It costs too much"));

    expect(onBarriersChange).toHaveBeenCalledWith(["cost"]);
  });
});
