import { beforeEach, describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { loadStoredState } from "./storage";

const STORAGE_KEY = "home-health-ai-ownership-state";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to demo state and removes malformed localStorage payload", () => {
    window.localStorage.setItem(STORAGE_KEY, "{malformed json");

    expect(() => loadStoredState()).not.toThrow();
    expect(loadStoredState()).toEqual(demoState);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
