import { afterEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import { OpenAiVisionProvider } from "./vision-provider";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("OpenAiVisionProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the model answer with grounding-safe citations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ mode: "answer", content: "That looks like about 25 grams of carbs — a solid pick." })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiVisionProvider({ passcode: "Tama" });
    const response = await provider.respond({
      mode: "food",
      patientInput: "How many carbs are in this?",
      state: demoState,
      image: "data:image/jpeg;base64,AAAA"
    });

    expect(response.safety).toBe("allowed");
    expect(response.content).toContain("carbs");
    // Care plan is always cited so the answer clears the grounding gate.
    expect(response.sources).toContain(demoState.carePlan.id);

    // The passcode and image are forwarded to the server route.
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/food/vision");
    const payload = JSON.parse(options.body as string) as { passcode?: string; image?: string };
    expect(payload.passcode).toBe("Tama");
    expect(payload.image).toContain("data:image/jpeg");
  });

  it("degrades to the on-device coach when the route is unconfigured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ mode: "unconfigured" }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiVisionProvider();
    const response = await provider.respond({
      mode: "food",
      patientInput: "What is this?",
      state: demoState
    });

    expect(response.safety).toBe("allowed");
    // Falls back to the mock coach's no-food coaching copy (conversation-first).
    expect(response.content.toLowerCase()).toContain("point your camera at any food");
  });

  it("degrades to the on-device coach when the fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiVisionProvider();
    const response = await provider.respond({
      mode: "food",
      patientInput: "What is this?",
      state: demoState
    });

    expect(response.safety).toBe("allowed");
    expect(response.content.length).toBeGreaterThan(0);
  });
});
