import { describe, expect, it } from "vitest";
import { nextProtocolStatus } from "./retinopathy-protocol";

describe("nextProtocolStatus", () => {
  it("moves an imported gap through explanation to a matched site", () => {
    expect(nextProtocolStatus("identified", "gap_explained")).toBe("explained");
    expect(nextProtocolStatus("explained", "site_matched")).toBe("site_matched");
    expect(nextProtocolStatus("site_matched", "appointment_confirmed")).toBe("scheduled");
  });

  it("routes result imports to the correct close-loop state", () => {
    expect(nextProtocolStatus("scheduled", "result_imported", "normal")).toBe("normal_closed");
    expect(nextProtocolStatus("scheduled", "result_imported", "abnormal")).toBe("abnormal_referral_needed");
    expect(nextProtocolStatus("scheduled", "result_imported", "ungradable")).toBe("repeat_needed");
  });

  it("ignores a result import with no outcome", () => {
    expect(nextProtocolStatus("scheduled", "result_imported")).toBe("scheduled");
  });

  it("keeps late-stage states from regressing on earlier events", () => {
    expect(nextProtocolStatus("scheduled", "gap_explained")).toBe("scheduled");
    expect(nextProtocolStatus("abnormal_referral_needed", "site_matched")).toBe("abnormal_referral_needed");
  });

  it("keeps completed from moving backwards", () => {
    expect(nextProtocolStatus("completed", "care_gap_imported")).toBe("completed");
  });

  it("keeps the normal-closed terminal state immutable", () => {
    expect(nextProtocolStatus("normal_closed", "gap_explained")).toBe("normal_closed");
    expect(nextProtocolStatus("normal_closed", "result_imported", "abnormal")).toBe("normal_closed");
  });

  it("tracks referral and repeat scheduling events", () => {
    expect(nextProtocolStatus("scheduled", "referral_scheduled")).toBe("abnormal_referral_needed");
    expect(nextProtocolStatus("scheduled", "repeat_scheduled")).toBe("repeat_needed");
  });
});
