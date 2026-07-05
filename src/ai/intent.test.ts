import { describe, expect, it } from "vitest";
import { inferAiMode } from "./intent";

describe("inferAiMode", () => {
  it("respects an explicitly chosen mode", () => {
    expect(inferAiMode("why do I take this", "visit")).toBe("visit");
    expect(inferAiMode("anything at all", "why")).toBe("why");
  });

  it("infers why from a feel-fine question at the default mode", () => {
    expect(inferAiMode("why do I have to take this if I feel fine?", "explain")).toBe("why");
  });

  it("infers visit intent", () => {
    expect(inferAiMode("help me prepare for my appointment", "explain")).toBe("visit");
  });

  it("infers trouble from side-effect language", () => {
    expect(inferAiMode("the cough is really bothering me", "explain")).toBe("trouble");
  });

  it("falls back to explain when nothing matches", () => {
    expect(inferAiMode("tell me about my plan", "explain")).toBe("explain");
  });
});
