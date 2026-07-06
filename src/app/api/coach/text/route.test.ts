import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/coach/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function completion(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("coach text route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects an empty question with 400", async () => {
    const response = await POST(makeRequest({ question: "   " }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.mode).toBe("error");
  });

  it("reports unconfigured without an OpenAI provider", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "");
    const response = await POST(makeRequest({ question: "how do I keep my blood sugar under control" }));

    const json = await response.json();
    expect(json.mode).toBe("unconfigured");
  });

  it("reports unconfigured when the API key is missing", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "");
    const response = await POST(makeRequest({ question: "how do I keep my blood sugar under control" }));

    const json = await response.json();
    expect(json.mode).toBe("unconfigured");
  });

  it("locks the demo when the passcode does not match", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    vi.stubEnv("DEMO_PASSCODE", "secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ question: "how do I keep my blood sugar under control", passcode: "wrong" }));
    const json = await response.json();

    expect(json.mode).toBe("locked");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the model answer when configured", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(completion("Keep logging your blood sugar and go easy on sugary drinks."));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({ question: "how do I keep my blood sugar under control", system: "system prompt" })
    );
    const json = await response.json();

    expect(json.mode).toBe("answer");
    expect(json.content).toContain("blood sugar");
    expect(fetchMock).toHaveBeenCalled();
  });
});
