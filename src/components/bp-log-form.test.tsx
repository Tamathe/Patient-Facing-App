import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { BpLogForm } from "./bp-log-form";

describe("BpLogForm", () => {
  it("submits a valid reading", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<BpLogForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Top number"), "128");
    await user.type(screen.getByLabelText("Bottom number"), "82");
    await user.type(screen.getByLabelText("Pulse"), "72");
    await user.click(screen.getByLabelText("Morning"));
    await user.click(screen.getByRole("button", { name: "Save reading" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        systolic: 128,
        diastolic: 82,
        pulse: 72,
        contexts: ["morning"]
      })
    );
  });
});
