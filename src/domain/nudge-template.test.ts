import { describe, expect, it } from "vitest";
import { lintNudgeMessage, renderNudge } from "./nudge-template";

describe("renderNudge", () => {
  it("renders the neutral check-in nudge in English and Spanish with exactly the approved slots", () => {
    const cases = [
      {
        language: "en" as const,
        checkName: "quick health check",
        message: "Hi Jordan — your quick health check is ready when you are."
      },
      {
        language: "es" as const,
        checkName: "chequeo rápido de salud",
        message: "Hola Jordan — tu chequeo rápido de salud está listo cuando quieras."
      }
    ];

    for (const { language, checkName, message } of cases) {
      expect(
        renderNudge({
          templateId: "checkin_nudge_v1",
          language,
          slots: { firstName: "Jordan", checkName }
        })
      ).toEqual({ ok: true, message });
    }
  });

  it("refuses missing, blank, or extra check-in nudge slots", () => {
    const slotCases: Record<string, string>[] = [
      { firstName: "Jordan" },
      { firstName: "Jordan", checkName: "   " },
      { firstName: "   ", checkName: "quick health check" },
      { firstName: "Jordan", checkName: "quick health check", instrument: "phq9" }
    ];

    for (const slots of slotCases) {
      expect(
        renderNudge({ templateId: "checkin_nudge_v1", language: "en", slots })
      ).toMatchObject({ ok: false });
    }
  });

  it.each([
    "mood check",
    "anxiety check",
    "alcohol check",
    "drug use check",
    "substance use check",
    "pregnancy check",
    "perinatal check",
    "chequeo de ánimo",
    "chequeo de ansiedad",
    "chequeo de alcohol",
    "chequeo de drogas",
    "chequeo de sustancias",
    "chequeo de embarazo"
  ])("refuses a sensitive checkName disclosure: %s", (checkName) => {
    expect(
      renderNudge({
        templateId: "checkin_nudge_v1",
        language: checkName.startsWith("chequeo") ? "es" : "en",
        slots: { firstName: "Jordan", checkName }
      })
    ).toMatchObject({ ok: false, reason: "slot_value_not_approved" });
  });

  it.each([
    { language: "en" as const, checkName: "PHQ-9" },
    { language: "en" as const, checkName: "NIDA" },
    { language: "en" as const, checkName: "prenatal check" },
    { language: "en" as const, checkName: "postpartum check" },
    { language: "es" as const, checkName: "posparto" },
    { language: "es" as const, checkName: "salud mental" },
    { language: "en" as const, checkName: "general wellness check" },
    { language: "es" as const, checkName: "chequeo general" },
    { language: "en" as const, checkName: "chequeo rápido de salud" },
    { language: "es" as const, checkName: "quick health check" }
  ])("refuses a non-allowlisted $language checkName: $checkName", ({ language, checkName }) => {
    expect(
      renderNudge({
        templateId: "checkin_nudge_v1",
        language,
        slots: { firstName: "Jordan", checkName }
      })
    ).toMatchObject({ ok: false, reason: "slot_value_not_approved" });
  });

  it("still disclosure-lints firstName with an allowlisted checkName", () => {
    expect(
      renderNudge({
        templateId: "checkin_nudge_v1",
        language: "en",
        slots: { firstName: "Depression Study", checkName: "quick health check" }
      })
    ).toMatchObject({ ok: false, reason: "disclosure_lint_failed" });
  });

  it("renders the approved screening nudge in English", () => {
    const rendered = renderNudge({
      templateId: "screening_nudge_v1",
      language: "en",
      slots: { firstName: "Jordan", months: "19" }
    });
    expect(rendered.ok).toBe(true);
    if (rendered.ok) {
      expect(rendered.message).toBe(
        "Hi Jordan — it's been 19 months since your last diabetes eye check. A new photo takes about 10 minutes, close to home."
      );
    }
  });

  it("renders the approved screening nudge in Spanish", () => {
    const rendered = renderNudge({
      templateId: "screening_nudge_v1",
      language: "es",
      slots: { firstName: "Jordan", months: "19" }
    });
    expect(rendered.ok).toBe(true);
    if (rendered.ok) {
      expect(rendered.message).toContain("Hola Jordan");
      expect(rendered.message).toContain("19 meses");
    }
  });

  it("refuses a template that is not on the approved list", () => {
    const rendered = renderNudge({ templateId: "improvised_v9", language: "en", slots: {} });
    expect(rendered).toMatchObject({ ok: false, reason: "template_not_approved" });
  });

  it("refuses when a required slot is missing or blank", () => {
    const rendered = renderNudge({
      templateId: "screening_nudge_v1",
      language: "en",
      slots: { firstName: " ", months: "19" }
    });
    expect(rendered).toMatchObject({ ok: false, reason: "missing_slot" });
  });

  it("refuses a rendered message that trips the prohibited-term lint", () => {
    const rendered = renderNudge({
      templateId: "screening_nudge_v1",
      language: "en",
      slots: { firstName: "Depression Study", months: "19" }
    });
    expect(rendered).toMatchObject({ ok: false, reason: "disclosure_lint_failed" });
  });

  it("renders the approved perinatal check-in nudge in English and Spanish", () => {
    for (const language of ["en", "es"] as const) {
      const rendered = renderNudge({
        templateId: "perinatal_check_nudge_v1",
        language,
        slots: { firstName: "Jordan" }
      });

      expect(rendered, language).toMatchObject({ ok: true });
      if (rendered.ok) {
        expect(rendered.message).toContain("Jordan");
        expect(lintNudgeMessage(rendered.message)).toEqual({ ok: true });
      }
    }
  });

  it("rejects a missing or blank caregiver name for the perinatal nudge", () => {
    const slotCases: Record<string, string>[] = [{}, { firstName: "   " }];
    for (const slots of slotCases) {
      expect(
        renderNudge({ templateId: "perinatal_check_nudge_v1", language: "en", slots })
      ).toMatchObject({ ok: false, reason: "missing_slot" });
    }
  });

  it("approves every Family Navigator stage template in English and Spanish", () => {
    const templateIds = [
      "family_stage_first_steps_v1",
      "family_stage_age_three_transition_v1",
      "family_stage_school_enrollment_v1",
      "family_stage_waiver_apply_v1",
      "family_stage_school_arc_v1",
      "family_stage_parent_connection_v1",
      "family_stage_sibling_respite_v1",
      "family_stage_mission_transition_v1",
      "family_stage_before_eighteen_v1"
    ];

    for (const templateId of templateIds) {
      for (const language of ["en", "es"] as const) {
        const rendered = renderNudge({ templateId, language, slots: {} });
        expect(rendered, `${templateId} (${language})`).toMatchObject({ ok: true });
      }
    }
  });

  it("approves the neutral development-check nudge without sensitive disclosure in both languages", () => {
    for (const language of ["en", "es"] as const) {
      const rendered = renderNudge({ templateId: "development_check_nudge_v1", language, slots: {} });
      expect(rendered).toMatchObject({ ok: true });
      if (rendered.ok) {
        expect(rendered.message).not.toMatch(/SWYC|diagnos|license|licencia/i);
        expect(lintNudgeMessage(rendered.message)).toEqual({ ok: true });
      }
    }
  });
});

describe("lintNudgeMessage", () => {
  it("passes the approved screening copy in both languages", () => {
    expect(lintNudgeMessage("it's been 19 months since your last diabetes eye check").ok).toBe(true);
    expect(lintNudgeMessage("han pasado 19 meses desde tu último chequeo de ojos por la diabetes").ok).toBe(true);
  });

  it("flags sensitive-category disclosures, en and es", () => {
    const en = lintNudgeMessage("your depression follow-up is ready");
    expect(en).toMatchObject({ ok: false, terms: ["depression"] });
    const es = lintNudgeMessage("apoyo por violencia doméstica disponible");
    expect(es.ok).toBe(false);
    const hiv = lintNudgeMessage("HIV care task ready");
    expect(hiv.ok).toBe(false);
  });
});
