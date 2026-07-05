import { describe, expect, it } from "vitest";
import { healthAiSystemPrompt } from "./prompts";

describe("health AI system prompt", () => {
  it("requires evidence labels for patient-specific facts", () => {
    expect(healthAiSystemPrompt).toContain("evidence labels");
    expect(healthAiSystemPrompt).toContain("confirmed, patient-reported, imported, inferred, or needs review");
    expect(healthAiSystemPrompt).toContain("uncertain data");
  });
});

