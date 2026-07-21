import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_CAREGIVER_TEXT, schoolAgeFamilyState } from "@/domain/family-fixtures";
import { POST } from "./route";

const ranked = {
  heard: "You told us school keeps sending him home.",
  lead: "school_iep",
  recommendations: [
    {
      id: "idea_school_discipline",
      why: "Removals past ten days trigger a review of whether the behavior is tied to a disability.",
      urgency: "act_now"
    }
  ]
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/family/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    text: SAMPLE_CAREGIVER_TEXT,
    profile: schoolAgeFamilyState.profile,
    passcode: "secret",
    language: "en",
    candidateIds: ["idea_school_discipline", "kde_evaluation_request"],
    ...overrides
  };
}

function completion(content: unknown): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

function configure(): void {
  vi.stubEnv("HEALTH_AI_PROVIDER", "openai");
  vi.stubEnv("HEALTH_AI_API_KEY", "key");
  vi.stubEnv("DEMO_PASSCODE", "secret");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("family recommend route", () => {
  it.each([
    ["short text", { text: "short" }],
    ["long text", { text: "x".repeat(5001) }],
    ["invalid profile", { profile: { ...schoolAgeFamilyState.profile, unknown: true } }],
    ["missing candidates", { candidateIds: [] }],
    ["too many candidates", { candidateIds: Array.from({ length: 25 }, (_, index) => `id-${index}`) }],
    ["unknown language", { language: "fr" }]
  ])("rejects %s with 400", async (_label, overrides) => {
    const response = await POST(request(validBody(overrides)));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ data: null });
  });

  it("reports unconfigured without a provider key and never calls out", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(validBody()));

    expect(await response.json()).toEqual({ mode: "unconfigured", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports locked on a passcode mismatch and never calls out", async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(validBody({ passcode: "wrong" })));

    expect(await response.json()).toEqual({ mode: "locked", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a validated ranking and prompts only with real catalog ids", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(completion(JSON.stringify(ranked)));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(validBody()));
    const payload = (await response.json()) as { mode: string; data: typeof ranked };

    expect(payload.mode).toBe("success");
    expect(payload.data.recommendations).toHaveLength(1);
    expect(payload.data.recommendations[0].id).toBe("idea_school_discipline");

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ content: string }>;
    };
    expect(sent.messages[1].content).toContain("idea_school_discipline");
    expect(sent.messages[1].content).toContain("kde_evaluation_request");
  });

  it("drops candidate ids that are not in the catalog before prompting", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(completion(JSON.stringify(ranked)));
    vi.stubGlobal("fetch", fetchMock);

    await POST(request(validBody({ candidateIds: ["idea_school_discipline", "not_a_real_resource"] })));

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ content: string }>;
    };
    expect(sent.messages[1].content).not.toContain("not_a_real_resource");
  });

  it("returns success with null data when every candidate id is unknown", async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(validBody({ candidateIds: ["nope", "still_nope"] })));

    expect(await response.json()).toEqual({ mode: "success", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("filters a hallucinated id out of the reply server-side", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        completion(
          JSON.stringify({
            ...ranked,
            recommendations: [
              ...ranked.recommendations,
              { id: "invented_program", why: "trust me", urgency: "soon" }
            ]
          })
        )
      )
    );

    const response = await POST(request(validBody()));
    const payload = (await response.json()) as { data: typeof ranked };

    expect(payload.data.recommendations.map(({ id }) => id)).toEqual(["idea_school_discipline"]);
  });

  it("treats an off-shape reply as unusable rather than trusting it", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completion(JSON.stringify({ heard: "only this" }))));

    const response = await POST(request(validBody()));

    expect(await response.json()).toEqual({ mode: "success", data: null });
  });

  it("treats unparseable content as unusable", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completion("not json at all")));

    const response = await POST(request(validBody()));

    expect(await response.json()).toEqual({ mode: "success", data: null });
  });

  it("returns 502 when the provider fails", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ data: null });
  });

  it("returns 502 when the provider call throws", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(502);
  });
});
