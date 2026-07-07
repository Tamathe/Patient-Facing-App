import { describe, expect, it } from "vitest";
import { DEMO_REPORT_FILES, extractFromPhotoName, extractFromTypedEntry } from "./dr-report-extract";

describe("extractFromPhotoName — bundled demo reports", () => {
  it("reads every bundled demo report with high confidence and listed fields", () => {
    for (const file of DEMO_REPORT_FILES) {
      const extraction = extractFromPhotoName(file);
      expect(extraction.refusal).toBeUndefined();
      expect(extraction.confidence).toBe("high");
      expect(extraction.fieldsRead.length).toBeGreaterThan(0);
    }
  });

  it("maps each fixture to its exact extraction", () => {
    expect(extractFromPhotoName("report-no-dr.svg")).toMatchObject({ grade: "no_dr", dmePresent: false, ungradable: false });
    expect(extractFromPhotoName("report-moderate-npdr.svg")).toMatchObject({
      grade: "moderate_npdr",
      dmePresent: false,
      ungradable: false
    });
    expect(extractFromPhotoName("report-pdr-dme.svg")).toMatchObject({ grade: "pdr", dmePresent: true, ungradable: false });
    expect(extractFromPhotoName("report-ungradable.svg")).toMatchObject({ grade: null, dmePresent: null, ungradable: true });
  });

  it("recognizes the stem regardless of path or extension case", () => {
    expect(extractFromPhotoName("C:/photos/REPORT-NO-DR.PNG").grade).toBe("no_dr");
  });

  it("refuses any other filename as unreadable — never guesses", () => {
    expect(extractFromPhotoName("IMG_2041.jpg")).toMatchObject({ refusal: "unreadable", grade: null });
    expect(extractFromPhotoName("report-final-v2.pdf")).toMatchObject({ refusal: "unreadable" });
  });

  it("refuses a retinal photograph by name with its own refusal", () => {
    expect(extractFromPhotoName("fundus-left.jpg")).toMatchObject({ refusal: "retinal_photograph" });
    expect(extractFromPhotoName("my-retina-scan.png")).toMatchObject({ refusal: "retinal_photograph" });
    expect(extractFromPhotoName("eye-photo.jpeg")).toMatchObject({ refusal: "retinal_photograph" });
  });
});

describe("extractFromTypedEntry — strict vocabulary", () => {
  it("parses each grade word", () => {
    expect(extractFromTypedEntry("no dr").grade).toBe("no_dr");
    expect(extractFromTypedEntry("none found").grade).toBe("no_dr");
    expect(extractFromTypedEntry("mild").grade).toBe("mild_npdr");
    expect(extractFromTypedEntry("moderate npdr").grade).toBe("moderate_npdr");
    expect(extractFromTypedEntry("severe").grade).toBe("severe_npdr");
    expect(extractFromTypedEntry("pdr").grade).toBe("pdr");
    expect(extractFromTypedEntry("proliferative retinopathy").grade).toBe("pdr");
  });

  it("parses DME presence and negation", () => {
    expect(extractFromTypedEntry("moderate with macular edema").dmePresent).toBe(true);
    expect(extractFromTypedEntry("moderate with dme").dmePresent).toBe(true);
    expect(extractFromTypedEntry("moderate, no macular edema").dmePresent).toBe(false);
    expect(extractFromTypedEntry("moderate").dmePresent).toBeNull();
  });

  it("parses ungradable", () => {
    expect(extractFromTypedEntry("ungradable")).toMatchObject({ ungradable: true, grade: null });
    expect(extractFromTypedEntry("unable to grade")).toMatchObject({ ungradable: true });
  });

  it("refuses conflicting grades rather than guessing", () => {
    expect(extractFromTypedEntry("mild to moderate")).toMatchObject({ refusal: "unreadable" });
  });

  it("refuses anything outside the vocabulary", () => {
    expect(extractFromTypedEntry("my eyes feel fine")).toMatchObject({ refusal: "unreadable" });
    expect(extractFromTypedEntry("")).toMatchObject({ refusal: "unreadable" });
    expect(extractFromTypedEntry("grade 4 hypertensive changes")).toMatchObject({ refusal: "unreadable" });
  });

  it("keeps typed confidence at medium — the human confirmation is the gate", () => {
    expect(extractFromTypedEntry("moderate").confidence).toBe("medium");
  });
});
