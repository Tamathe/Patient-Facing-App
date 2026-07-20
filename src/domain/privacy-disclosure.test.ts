import { describe, expect, it } from "vitest";
import { aiDataModeForVoiceTransport } from "./privacy-disclosure";

describe("aiDataModeForVoiceTransport", () => {
  it("maps the resolved live transport to the live disclosure", () => {
    expect(aiDataModeForVoiceTransport({ mode: "live" })).toBe("live_voice");
  });

  it("maps configured mock reasons to the on-device disclosure", () => {
    expect(aiDataModeForVoiceTransport({ mode: "mock", reason: "provider_mock" })).toBe("on_device");
    expect(aiDataModeForVoiceTransport({ mode: "mock", reason: "locked" })).toBe("on_device");
  });

  it("uses the conservative cloud disclosure when transport resolution fails", () => {
    expect(aiDataModeForVoiceTransport({ mode: "error" })).toBe("cloud_text");
    expect(aiDataModeForVoiceTransport({ mode: "mock", reason: "fetch_failed" })).toBe("cloud_text");
  });
});
