import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { KY_COUNTIES } from "@/domain/family-resources";
import type { FamilyProfile } from "@/domain/types";
import { FamilyProfileForm } from "./family-profile-form";

const existingProfile: FamilyProfile = {
  childFirstName: "Riley",
  birthYear: 2017,
  schoolStage: "elementary",
  county: "Scott",
  diagnoses: [{ id: "diagnosis-adhd-existing", label: "adhd", diagnosedAt: "2026-05" }]
};

describe("FamilyProfileForm", () => {
  it("offers exactly 120 Kentucky counties plus a placeholder and normalizes the patient county default", () => {
    render(
      <FamilyProfileForm
        language="en"
        initialProfile={null}
        defaultCounty="Scott County"
        onSave={vi.fn()}
        onSeedExample={vi.fn()}
      />
    );

    const county = screen.getByLabelText("Kentucky county") as HTMLSelectElement;
    expect(county).toHaveValue("Scott");
    expect(within(county).getAllByRole("option")).toHaveLength(121);
    expect(within(county).getAllByRole("option").slice(1).map((option) => option.getAttribute("value"))).toEqual([
      ...KY_COUNTIES
    ]);
  });

  it("saves only the minimal profile, supports all diagnoses and month-only dates, and preserves diagnosis IDs", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FamilyProfileForm
        language="en"
        initialProfile={existingProfile}
        defaultCounty="Perry"
        onSave={onSave}
        onSeedExample={vi.fn()}
      />
    );

    expect(screen.getAllByRole("checkbox")).toHaveLength(8);
    expect(screen.getByRole("checkbox", { name: "ADHD" })).toBeChecked();
    expect(screen.getByLabelText("ADHD diagnosis month (optional)")).toHaveValue("2026-05");

    await user.clear(screen.getByLabelText("Child's first name (optional)"));
    await user.type(screen.getByLabelText("Child's first name (optional)"), "Riley");
    await user.selectOptions(screen.getByLabelText("Birth month"), "8");
    await user.click(screen.getByRole("checkbox", { name: "Other" }));
    await user.type(screen.getByLabelText("Other diagnosis label"), "Specific learning disability");
    await user.type(screen.getByLabelText("Other diagnosis month (optional)"), "2026-06");
    await user.click(screen.getByRole("button", { name: "Save family profile" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as FamilyProfile;
    expect(saved).toMatchObject({
      childFirstName: "Riley",
      birthYear: 2017,
      birthMonth: 8,
      schoolStage: "elementary",
      county: "Scott"
    });
    expect(saved.diagnoses.find(({ label }) => label === "adhd")).toEqual({
      id: "diagnosis-adhd-existing",
      label: "adhd",
      diagnosedAt: "2026-05"
    });
    expect(saved.diagnoses.find(({ label }) => label === "other")).toMatchObject({
      label: "other",
      otherLabel: "Specific learning disability",
      diagnosedAt: "2026-06"
    });
    expect(saved).not.toHaveProperty("income");
    expect(saved).not.toHaveProperty("address");
    expect(saved).not.toHaveProperty("birthDay");
    expect(saved).not.toHaveProperty("lastName");
    expect(screen.queryByLabelText(/income|address|full birth|birth day|last name|caregiver name/i)).not.toBeInTheDocument();
  });

  it("validates birth year against 1900 through the current year", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FamilyProfileForm
        language="en"
        initialProfile={existingProfile}
        onSave={onSave}
        onSeedExample={vi.fn()}
      />
    );

    await user.clear(screen.getByLabelText("Birth year"));
    await user.type(screen.getByLabelText("Birth year"), String(new Date().getFullYear() + 1));
    await user.click(screen.getByRole("button", { name: "Save family profile" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/valid four-digit birth year/i);
  });

  it.each([
    ["en" as const, "", "Other diagnosis label", /enter the other diagnosis wording/i],
    ["en" as const, "   ", "Other diagnosis label", /enter the other diagnosis wording/i],
    ["es" as const, "", "Otro diagnóstico", /ingresa las palabras del otro diagnóstico/i],
    ["es" as const, "   ", "Otro diagnóstico", /ingresa las palabras del otro diagnóstico/i]
  ])("rejects an empty or whitespace-only Other diagnosis with a localized linked error in %s", async (language, value, label, error) => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FamilyProfileForm
        language={language}
        initialProfile={existingProfile}
        onSave={onSave}
        onSeedExample={vi.fn()}
      />
    );

    await user.click(screen.getByRole("checkbox", { name: language === "es" ? "Otro" : "Other" }));
    const input = screen.getByLabelText(label);
    if (value) {
      await user.type(input, value);
    }
    await user.click(screen.getByRole("button", { name: language === "es" ? "Guardar perfil familiar" : "Save family profile" }));

    expect(onSave).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(error);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });

  it("keeps Morgan and Casey as example-button labels and dispatches only the selected fixture", async () => {
    const user = userEvent.setup();
    const onSeedExample = vi.fn();
    render(
      <FamilyProfileForm
        language="en"
        initialProfile={null}
        onSave={vi.fn()}
        onSeedExample={onSeedExample}
      />
    );

    await user.click(screen.getByRole("button", { name: /Morgan and Riley.*Scott County/ }));
    await user.click(screen.getByRole("button", { name: /Casey.*Perry County/ }));

    expect(onSeedExample.mock.calls).toEqual([["morgan"], ["casey"]]);
    expect(screen.queryByLabelText(/caregiver name/i)).not.toBeInTheDocument();
  });
});
