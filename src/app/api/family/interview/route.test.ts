import { afterEach, describe, expect, it, vi } from "vitest";
import { morganFamilyState } from "@/domain/family-fixtures";
import { POST } from "./route";

const result = {
  facts: [{ label: "Grade", value: "fourth grade", sourceSnippet: "fourth grade" }],
  domains: [{ domain: "school_iep", rationale: "The caregiver described a school concern." }],
  followUps: []
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/family/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    text: morganFamilyState.interviewDraft,
    profile: morganFamilyState.profile,
    passcode: "secret",
    language: "en",
    ...overrides
  };
}

function completion(content: unknown): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("family interview route", () => {
  it.each([
    ["short text", { text: "short" }],
    ["whitespace-only text", { text: " ".repeat(10) }],
    ["long text", { text: "x".repeat(5001) }],
    ["invalid profile", { profile: { ...morganFamilyState.profile, unknown: true } }],
    [
      "invalid nested diagnosis",
      {
        profile: {
          ...morganFamilyState.profile,
          diagnoses: [{ ...morganFamilyState.profile!.diagnoses[0], unknown: true }]
        }
      }
    ],
    ["invalid language", { language: "fr" }],
    ["unknown body key", { unknown: true }]
  ])("strictly rejects %s before any provider call", async (_name, overrides) => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    vi.stubEnv("DEMO_PASSCODE", "secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(request(validBody(overrides)));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing DEMO_PASSCODE", { HEALTH_AI_PROVIDER: "openai", HEALTH_AI_API_KEY: "test-key", DEMO_PASSCODE: "" }, "locked"],
    ["wrong passcode", { HEALTH_AI_PROVIDER: "openai", HEALTH_AI_API_KEY: "test-key", DEMO_PASSCODE: "secret" }, "locked"],
    ["missing provider", { HEALTH_AI_PROVIDER: "", HEALTH_AI_API_KEY: "test-key", DEMO_PASSCODE: "secret" }, "unconfigured"],
    ["missing key", { HEALTH_AI_PROVIDER: "openai", HEALTH_AI_API_KEY: "", DEMO_PASSCODE: "secret" }, "unconfigured"]
  ])("returns %s without calling the provider", async (_name, env, mode) => {
    vi.stubEnv("HEALTH_AI_PROVIDER", env.HEALTH_AI_PROVIDER);
    vi.stubEnv("HEALTH_AI_API_KEY", env.HEALTH_AI_API_KEY);
    vi.stubEnv("DEMO_PASSCODE", env.DEMO_PASSCODE);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(request(validBody({ passcode: _name === "wrong passcode" ? "wrong" : "secret" })));
    expect(await res.json()).toEqual({ mode, data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls OpenAI-compatible JSON chat completions with a 15-second abort signal and no catalog names", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    vi.stubEnv("DEMO_PASSCODE", "secret");
    vi.stubEnv("HEALTH_AI_INTERVIEW_MODEL", "interview-model");
    const fetchMock = vi.fn().mockResolvedValue(completion(JSON.stringify(result)));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(request(validBody()));
    expect(await res.json()).toEqual({ mode: "success", data: result });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const payload = JSON.parse(options.body as string) as {
      model: string;
      response_format: { type: string };
      messages: Array<{ role: string; content: string }>;
    };
    expect(payload.model).toBe("interview-model");
    expect(payload.response_format).toEqual({ type: "json_object" });
    expect(payload.messages[0].content).toContain("early_intervention");
    expect(payload.messages[0].content).toContain("never state that the child has a condition");
    expect(payload.messages.map(({ content }) => content).join("\n")).toContain("Riley");
    expect(payload.messages.map(({ content }) => content).join("\n")).not.toMatch(/KY-SPIN|Michelle P\.|First Steps|catalog|resource name/i);
  });

  it.each([
    ["malformed JSON", "not json"],
    ["off-shape JSON", JSON.stringify({ ...result, surprise: true })]
  ])("returns data null for %s model content", async (_name, content) => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    vi.stubEnv("DEMO_PASSCODE", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completion(content)));

    const res = await POST(request(validBody()));
    expect(await res.json()).toEqual({ mode: "success", data: null });
  });

  it("defensively returns data null for a malformed provider envelope", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    vi.stubEnv("DEMO_PASSCODE", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: "wrong" }), { status: 200 })));

    expect(await (await POST(request(validBody()))).json()).toEqual({ mode: "success", data: null });
  });
});
