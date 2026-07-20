import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { FamilyScreeningResult } from "./family-screening-result";

describe("FamilyScreeningResult", () => {
  it("renders the Fayette point of entry before statewide First Steps with contact and source provenance", () => {
    render(
      <FamilyScreeningResult
        childAgeMonths={18}
        county="Fayette"
        kind="first_steps"
        language="en"
      />
    );

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent(/First Steps.*Bluegrass Point of Entry/i);
    expect(headings[1]).toHaveTextContent("Kentucky First Steps");
    expect(screen.getByText(/Call 859-271-9448/)).toBeVisible();
    expect(screen.getByText(/Call 877-417-8377/)).toBeVisible();
    expect(screen.getByText(/Contact this point of entry soon/i)).toBeVisible();
    expect(screen.getByText(/not emergency care/i)).toBeVisible();
    expect(screen.queryByText(/911/i)).not.toBeInTheDocument();
    const sourceLinks = screen.getAllByRole("link");
    expect(sourceLinks).toHaveLength(2);
    expect(sourceLinks[0]).toHaveTextContent("Kentucky Early Intervention System POE listing (12/25)");
    expect(sourceLinks[0]).toHaveAttribute(
      "href",
      "https://www.chfs.ky.gov/agencies/dph/dmch/ecdb/fs/POElistingforWebsite.pdf"
    );
    expect(sourceLinks[1]).toHaveTextContent("Kentucky Early Intervention System");
    expect(sourceLinks[1]).toHaveAttribute(
      "href",
      "https://www.chfs.ky.gov/agencies/dph/dmch/ecdb/Pages/keis.aspx"
    );
  });

  it("keeps the same First Steps order and localized contact actions in Spanish", () => {
    render(
      <FamilyScreeningResult
        childAgeMonths={18}
        county="Fayette"
        kind="first_steps"
        language="es"
      />
    );

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent(/First Steps.*Bluegrass Point of Entry/i);
    expect(headings[1]).toHaveTextContent("Kentucky First Steps");
    expect(screen.getByText(/Llama al 859-271-9448 o 800-454-2764/i)).toBeVisible();
    expect(screen.getByText(/Llama al 877-417-8377/i)).toBeVisible();
    expect(screen.queryByText(/Call 859-271-9448/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Contacta pronto este punto de entrada/i)).toBeVisible();
    expect(screen.getByText(/seguimiento importante/i)).toBeVisible();
    expect(screen.getByText(/emergencia/i)).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders a non-diagnostic PSC pediatrician conversation card in both languages", () => {
    const { unmount } = render(<FamilyScreeningResult kind="psc17" language="en" />);
    expect(screen.getByText(/Bring these results to your child's pediatrician/i)).toBeVisible();
    expect(screen.getByText(/does not diagnose/i)).toBeVisible();
    unmount();

    render(<FamilyScreeningResult kind="psc17" language="es" />);
    expect(screen.getByText(/Lleva estos resultados al pediatra/i)).toBeVisible();
    expect(screen.getByText(/no diagnostica/i)).toBeVisible();
  });
});
