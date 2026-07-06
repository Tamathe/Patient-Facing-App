import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/food/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function completion(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("food vision route", () => {
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
    const response = await POST(makeRequest({ question: "How many carbs?" }));

    const json = await response.json();
    expect(json.mode).toBe("unconfigured");
  });

  it("reports unconfigured when the API key is missing", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "");
    const response = await POST(makeRequest({ question: "How many carbs?" }));

    const json = await response.json();
    expect(json.mode).toBe("unconfigured");
  });

  it("locks the demo when the passcode does not match", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    vi.stubEnv("DEMO_PASSCODE", "secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ question: "How many carbs?", passcode: "wrong" }));
    const json = await response.json();

    expect(json.mode).toBe("locked");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an answer and forwards the image plus a safety identifier", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(completion("About 25 grams of carbs."));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        patientId: "patient-1",
        question: "How many carbs are in this?",
        system: "You are a food coach.",
        foodContext: "Food data: none",
        image: "data:image/jpeg;base64,AAAA"
      })
    );
    const json = await response.json();

    expect(json.mode).toBe("answer");
    expect(json.content).toContain("carbs");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["OpenAI-Safety-Identifier"]).toMatch(/^pc_voice_/);

    const payload = JSON.parse(options.body as string) as {
      messages: Array<{ role: string; content: unknown }>;
    };
    const userTurn = payload.messages.find((message) => message.role === "user");
    const parts = userTurn?.content as Array<{ type: string }>;
    expect(parts.some((part) => part.type === "image_url")).toBe(true);
  });

  it("drops an oversized image instead of forwarding it to the model", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(completion("I can't quite see the photo."));
    vi.stubGlobal("fetch", fetchMock);

    // ~2MB base64 data URL — well over the ~1.1MB cap and far past a real camera frame.
    const oversized = `data:image/jpeg;base64,${"A".repeat(2_000_000)}`;
    await POST(makeRequest({ question: "What is this?", image: oversized }));

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string) as {
      messages: Array<{ role: string; content: unknown }>;
    };
    const userTurn = payload.messages.find((message) => message.role === "user");
    const parts = userTurn?.content as Array<{ type: string }>;
    expect(parts.some((part) => part.type === "image_url")).toBe(false);
  });

  it("enables JSON mode and a larger token budget for pantry scans", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(completion('{"detectedItems":[],"recipes":[]}'));
    vi.stubGlobal("fetch", fetchMock);

    await POST(makeRequest({ question: "pantry", json: true, maxTokens: 900 }));

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string) as {
      response_format?: { type: string };
      max_tokens?: number;
    };
    expect(payload.response_format).toEqual({ type: "json_object" });
    expect(payload.max_tokens).toBe(900);
  });

  it("clamps an over-large maxTokens request", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(completion("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await POST(makeRequest({ question: "pantry", maxTokens: 99999 }));

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string) as { max_tokens?: number };
    expect(payload.max_tokens).toBe(1000);
  });

  it("does not forward a non-image data string as an image part", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(completion("I can't see a photo."));
    vi.stubGlobal("fetch", fetchMock);

    await POST(makeRequest({ question: "What is this?", image: "not-a-data-url" }));

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string) as {
      messages: Array<{ role: string; content: unknown }>;
    };
    const userTurn = payload.messages.find((message) => message.role === "user");
    const parts = userTurn?.content as Array<{ type: string }>;
    expect(parts.some((part) => part.type === "image_url")).toBe(false);
  });
});
