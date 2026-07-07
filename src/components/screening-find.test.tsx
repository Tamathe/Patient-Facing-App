import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ScreeningFind } from "./screening-find";

describe("ScreeningFind", () => {
  it("leads with one recommendation from the entered ZIP", () => {
    render(<ScreeningFind canBook initialZip="41701" language="en" onBook={vi.fn()} />);

    expect(screen.getByText("Recommended for you")).toBeInTheDocument();
    expect(screen.getByText(/Tuesday 2:40 PM at Perry County FQHC Mobile Camera/)).toBeInTheDocument();
    // The ranked list stays collapsed until asked for.
    expect(screen.queryByText("Hazard FQHC Eye Program")).not.toBeInTheDocument();
  });

  it("books the recommended site with one tap", async () => {
    const user = userEvent.setup();
    const onBook = vi.fn();
    render(<ScreeningFind canBook initialZip="41701" language="en" onBook={onBook} />);

    await user.click(screen.getByRole("button", { name: "Book it" }));

    expect(onBook).toHaveBeenCalledTimes(1);
    expect(onBook.mock.calls[0][0].id).toBe("site_fqhc_mobile");
  });

  it("expands other options with the equity nudge and mode chips", async () => {
    const user = userEvent.setup();
    render(<ScreeningFind canBook initialZip="41701" language="en" onBook={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "See other options" }));

    expect(screen.getByText(/Nearest eye specialist/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fastest" })).toBeInTheDocument();
    expect(screen.getByText("Hazard FQHC Eye Program")).toBeInTheDocument();
    expect(screen.getAllByText(/Ride support/).length).toBeGreaterThan(0);
  });

  it("re-ranks when the ZIP changes to Louisville", async () => {
    const user = userEvent.setup();
    render(<ScreeningFind canBook initialZip="41701" language="en" onBook={vi.fn()} />);

    const zip = screen.getByLabelText("Your ZIP code");
    await user.clear(zip);
    await user.type(zip, "40202");

    expect(screen.getByText(/Family Health Centers - Louisville/)).toBeInTheDocument();
  });

  it("hides booking when there is nothing to book", () => {
    render(<ScreeningFind canBook={false} initialZip="41701" language="en" onBook={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Book it" })).not.toBeInTheDocument();
  });
});
