import { describe, expect, it } from "vitest";
import { canTransition, outcomeToStatus, transition } from "./screening-gap";
import type { ScreeningGap, ScreeningGapStatus } from "./types";

const gap = (status: ScreeningGapStatus): ScreeningGap => ({
  id: "gap-1",
  condition: "diabetes",
  status,
  lastScreeningDate: "2024-12-10"
});

describe("screening-gap transitions", () => {
  it("allows overdue -> engaged and overdue -> closed reconciliation", () => {
    expect(canTransition("overdue", "engaged")).toBe(true);
    expect(canTransition("overdue", "closed")).toBe(true);
  });

  it("rejects illegal edges like overdue -> scheduled", () => {
    expect(canTransition("overdue", "scheduled")).toBe(false);
  });

  it("transition returns a new gap with the new status", () => {
    const input = gap("scheduled");
    const next = transition(input, "completed");
    expect(next.status).toBe("completed");
    expect(next).not.toBe(input);
  });

  it("transition throws on an illegal edge", () => {
    expect(() => transition(gap("closed"), "engaged")).toThrow();
  });

  it("allows a repeat gap to be rebooked", () => {
    expect(canTransition("repeat", "scheduled")).toBe(true);
  });

  it("maps result outcomes to statuses", () => {
    expect(outcomeToStatus("normal")).toBe("closed");
    expect(outcomeToStatus("abnormal")).toBe("referral");
    expect(outcomeToStatus("ungradable")).toBe("repeat");
  });
});
