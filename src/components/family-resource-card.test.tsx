import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { getFamilyResourceById } from "@/domain/family-resources";
import { FamilyResourceCard } from "./family-resource-card";

const michelle = getFamilyResourceById("michelle_p_waiver")!;

function renderCard(overrides: Partial<React.ComponentProps<typeof FamilyResourceCard>> = {}) {
  const props: React.ComponentProps<typeof FamilyResourceCard> = {
    resource: michelle,
    domain: "waivers_financial",
    language: "en",
    isSaved: false,
    isEnrolled: false,
    onSave: vi.fn(),
    onShare: vi.fn(),
    onToggleEnrollment: vi.fn(),
    ...overrides
  };
  return { ...render(<FamilyResourceCard {...props} />), props };
}

describe("FamilyResourceCard", () => {
  it("renders all catalog provenance, contact, referral, age, and urgency fields", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: michelle.name })).toBeVisible();
    expect(screen.getByText(michelle.summary)).toBeVisible();
    expect(screen.getByText(michelle.contact)).toBeVisible();
    expect(screen.getByText(michelle.sourceName, { exact: false })).toBeVisible();
    expect(screen.getByText(michelle.verifiedAt, { exact: false })).toBeVisible();
    expect(screen.getByText(michelle.actNow!)).toBeVisible();
    expect(screen.getByText(/all ages/i)).toBeVisible();
    expect(screen.getByText(/start online/i)).toBeVisible();
    const sourceLink = screen.getByRole("link", { name: /Open source link.*Michelle P/i });
    expect(sourceLink).toHaveAttribute("href", michelle.sourceUrl);
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noreferrer");
  });

  it("suppresses urgency for enrolled resources and exposes an aria-pressed enrollment toggle", async () => {
    const user = userEvent.setup();
    const onToggleEnrollment = vi.fn();
    renderCard({ isEnrolled: true, onToggleEnrollment });

    expect(screen.getByText("Already receiving this")).toBeVisible();
    expect(screen.queryByText(michelle.actNow!)).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /Remove already-receiving mark.*Michelle P/i });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(onToggleEnrollment).toHaveBeenCalledWith(michelle.id);
  });

  it("saves idempotently and shares once only after per-card consent", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onShare = vi.fn();
    renderCard({ onSave, onShare });

    const save = screen.getByRole("button", { name: /Save.*Michelle P/i });
    await user.dblClick(save);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(michelle, "waivers_financial");

    const share = screen.getByRole("button", { name: /Share.*Michelle P/i });
    expect(share).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /I agree to share this resource now.*Michelle P/i }));
    expect(share).toBeEnabled();
    await user.dblClick(share);
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledWith(michelle);
  });

  it("uses unique consent controls when the same resource appears in matched and saved sections", () => {
    render(
      <>
        <FamilyResourceCard
          resource={michelle}
          domain="waivers_financial"
          language="en"
          isSaved={false}
          isEnrolled={false}
          onSave={vi.fn()}
          onShare={vi.fn()}
          onToggleEnrollment={vi.fn()}
        />
        <FamilyResourceCard
          resource={michelle}
          domain="waivers_financial"
          language="en"
          isSaved
          isEnrolled={false}
          onSave={vi.fn()}
          onShare={vi.fn()}
          onToggleEnrollment={vi.fn()}
        />
      </>
    );

    const checkboxes = screen.getAllByRole("checkbox", { name: /I agree to share this resource now.*Michelle P/i });
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].id).not.toBe(checkboxes[1].id);
    expect(within(checkboxes[0].closest("article")!).getByRole("button", { name: /Share.*Michelle P/i })).toBeDisabled();
  });

  it("shows the manual-verification warning when the catalog requires it", () => {
    const stable = getFamilyResourceById("stable_kentucky")!;
    renderCard({ resource: stable, domain: "future_planning" });
    expect(screen.getByText(/confirm current details with a person/i)).toBeVisible();
  });
});
