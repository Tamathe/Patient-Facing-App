import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/realtime/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("realtime token route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("blocks with 409 when the client attests an open crisis", async () => {
    const response = await POST(makeRequest({ crisisOpen: true }));

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json).toEqual({ mode: "blocked", reason: "open_red_flag" });
  });

  it("stays in mock mode without an OpenAI provider", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "");
    const response = await POST(makeRequest({ crisisOpen: false }));

    const json = await response.json();
    expect(json.mode).toBe("mock");
  });

  it("sends an OpenAI-Safety-Identifier header on the mint request", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: "client-secret", expires_at: 123 }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ patientId: "patient-1", crisisOpen: false }));
    const json = await response.json();

    expect(json.mode).toBe("live");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["OpenAI-Safety-Identifier"]).toMatch(/^pc_voice_/);
  });

  it("reports cloud availability without minting a client secret", async () => {
    vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
    vi.stubEnv("HEALTH_AI_API_KEY", "test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ patientId: "patient-1", probe: true }));

    await expect(response.json()).resolves.toEqual({ mode: "live", model: "gpt-realtime-2" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
