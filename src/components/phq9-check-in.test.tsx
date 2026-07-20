import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { Phq9CheckIn } from "./phq9-check-in";

describe("Phq9CheckIn", () => {
  it("gates the questionnaire behind the consent screen on first run", async () => {
    const user = userEvent.setup();
    render(<Phq9CheckIn language="en" onComplete={vi.fn()} />);

    // The first PHQ-9 item must not be visible until consent is acknowledged.
    expect(screen.queryByText(/Little interest or pleasure/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start the check-in/i }));

    expect(screen.getByText(/Little interest or pleasure/i)).toBeInTheDocument();
  });

  it("blocks submission until every item is answered, then reports responses", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Phq9CheckIn language="en" onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: /start the check-in/i }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).not.toHaveBeenCalled();

    const groups = screen.getAllByRole("group");
    for (const group of groups) {
      const options = group.querySelectorAll('input[type="radio"]');
      await user.click(options[0]);
    }

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onComplete).toHaveBeenCalledWith([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
