import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_CAREGIVER_TEXT, schoolAgeFamilyState } from "@/domain/family-fixtures";
import { requestFamilyInterview } from "./family-interview-provider";

const result = {
  facts: [{ label: "Grade", value: "fourth grade", sourceSnippet: "fourth grade" }],
  domains: [{ domain: "school_iep", rationale: "School support was requested." }],
  followUps: []
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("requestFamilyInterview", () => {
  it("returns a validated live result and sends profile, text, passcode, and language", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ mode: "success", data: result }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestFamilyInterview({
        text: SAMPLE_CAREGIVER_TEXT,
        profile: schoolAgeFamilyState.profile!,
        passcode: "demo-code",
        language: "es"
      })
    ).resolves.toEqual(result);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/family/interview");
    expect(JSON.parse(options.body as string)).toEqual({
      text: SAMPLE_CAREGIVER_TEXT,
      profile: schoolAgeFamilyState.profile,
      passcode: "demo-code",
      language: "es"
    });
  });

  it.each([
    ["non-OK", response({ data: result }, 502)],
    ["locked", response({ mode: "locked", data: null })],
    ["unconfigured", response({ mode: "unconfigured", data: null })],
    ["missing success mode", response({ data: result })],
    ["malformed", response({ mode: "success", data: { ...result, extra: true } })],
    ["off-shape", response({ mode: "success", data: { facts: "wrong", domains: [], followUps: [] } })]
  ])("returns null for %s responses", async (_name, serverResponse) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(serverResponse));
    await expect(
      requestFamilyInterview({ text: SAMPLE_CAREGIVER_TEXT, profile: schoolAgeFamilyState.profile!, language: "en" })
    ).resolves.toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(
      requestFamilyInterview({ text: SAMPLE_CAREGIVER_TEXT, profile: schoolAgeFamilyState.profile!, language: "en" })
    ).resolves.toBeNull();
  });

  it("aborts after 15 seconds and returns null", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = requestFamilyInterview({
      text: SAMPLE_CAREGIVER_TEXT,
      profile: schoolAgeFamilyState.profile!,
      language: "en"
    });
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(pending).resolves.toBeNull();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns null when abort-controller setup fails outside a browser", async () => {
    vi.stubGlobal(
      "AbortController",
      class BrokenAbortController {
        constructor() {
          throw new Error("unavailable");
        }
      }
    );
    await expect(
      requestFamilyInterview({ text: SAMPLE_CAREGIVER_TEXT, profile: schoolAgeFamilyState.profile!, language: "en" })
    ).resolves.toBeNull();
  });
});
