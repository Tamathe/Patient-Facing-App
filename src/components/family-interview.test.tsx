import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { morganFamilyState } from "@/domain/family-fixtures";
import { FamilyInterview } from "./family-interview";

const { push, requestFamilyInterview } = vi.hoisted(() => ({ push: vi.fn(), requestFamilyInterview: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/ai/family-interview-provider", () => ({ requestFamilyInterview }));

type FakeResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionInstance = {
  onresult: ((event: FakeResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

let recognition: RecognitionInstance | undefined;

function installSpeech(): void {
  function FakeRecognition() {
    recognition = {
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn(),
      stop: vi.fn()
    };
    return recognition;
  }
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;
}

function renderInterview(overrides: Partial<React.ComponentProps<typeof FamilyInterview>> = {}) {
  const props: React.ComponentProps<typeof FamilyInterview> = {
    profile: morganFamilyState.profile!,
    draft: morganFamilyState.interviewDraft,
    passcode: "secret",
    language: "en",
    onDraftChange: vi.fn(),
    onExtracted: vi.fn(),
    ...overrides
  };
  return { ...render(<FamilyInterview {...props} />), props };
}

beforeEach(() => {
  push.mockClear();
  requestFamilyInterview.mockReset();
  requestFamilyInterview.mockResolvedValue(null);
  recognition = undefined;
});

afterEach(() => {
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

describe("FamilyInterview", () => {
  it("uses the deterministic fallback whenever live extraction returns null", async () => {
    const onExtracted = vi.fn();
    renderInterview({ onExtracted });
    fireEvent.click(screen.getByRole("button", { name: /crunch|extract/i }));

    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
    expect(onExtracted.mock.calls[0][0].domains.map(({ domain }: { domain: string }) => domain)).toEqual([
      "school_iep",
      "waivers_financial",
      "parent_support"
    ]);
    expect(onExtracted.mock.calls[0].slice(1)).toEqual(["mock", "typed"]);
  });

  it("falls back locally when the provider throws and sanitizes unsafe live rationales", async () => {
    requestFamilyInterview.mockRejectedValueOnce(new Error("unexpected"));
    const onExtracted = vi.fn();
    renderInterview({ onExtracted });
    fireEvent.click(screen.getByRole("button", { name: /crunch|extract/i }));
    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith(expect.any(Object), "mock", "typed"));

    requestFamilyInterview.mockResolvedValueOnce({
      facts: [],
      domains: [{ domain: "school_iep", rationale: "Riley has dyslexia." }],
      followUps: []
    });
    fireEvent.click(screen.getByRole("button", { name: /crunch|extract/i }));
    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(2));
    expect(onExtracted.mock.calls[1]).toEqual([
      { facts: [], domains: [{ domain: "school_iep" }], followUps: [] },
      "live",
      "typed"
    ]);
  });

  it.each([
    "honestly she's been saying she wants to die",
    "I have chest pain and cannot breathe",
    "There is no food today"
  ])("routes safety text before networking or extraction: %s", async (text) => {
    const onExtracted = vi.fn();
    renderInterview({ draft: text, onExtracted });
    fireEvent.click(screen.getByRole("button", { name: /crunch|extract/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/chat?ask=${encodeURIComponent(text)}`));
    expect(requestFamilyInterview).not.toHaveBeenCalled();
    expect(onExtracted).not.toHaveBeenCalled();
  });

  it("appends repeated final speech transcripts with one space and never auto-submits", async () => {
    installSpeech();
    const onDraftChange = vi.fn();
    const onExtracted = vi.fn();
    renderInterview({ draft: "Existing words", onDraftChange, onExtracted });
    const mic = await screen.findByRole("button", { name: /speak|mic|voice/i });
    fireEvent.click(mic);

    act(() => recognition?.onresult?.({ results: [[{ transcript: "first final" }]] }));
    act(() => recognition?.onresult?.({ results: [[{ transcript: "second final" }]] }));

    expect(screen.getByLabelText(/family|tell us|interview/i)).toHaveValue("Existing words first final second final");
    expect(onDraftChange).toHaveBeenLastCalledWith("Existing words first final second final");
    expect(requestFamilyInterview).not.toHaveBeenCalled();
    expect(onExtracted).not.toHaveBeenCalled();
  });

  it("ignores interim speech results", async () => {
    installSpeech();
    renderInterview({ draft: "Existing words" });
    fireEvent.click(await screen.findByRole("button", { name: /speak|mic|voice/i }));
    const interim = [[{ transcript: "not final" }]] as Array<Array<{ transcript: string }>> & { isFinal?: boolean };
    Object.assign(interim[0], { isFinal: false });
    act(() => recognition?.onresult?.({ results: interim }));
    expect(screen.getByLabelText(/family|tell us|interview/i)).toHaveValue("Existing words");
  });

  it.each([
    ["", "This came from the microphone", "voice"],
    ["Existing typed words", "then the microphone", "mixed"]
  ])("emits %s plus speech with %s provenance", async (draft, transcript, expectedSource) => {
    installSpeech();
    const onExtracted = vi.fn();
    renderInterview({ draft, onExtracted });
    fireEvent.click(await screen.findByRole("button", { name: /speak|mic|voice/i }));
    act(() => recognition?.onresult?.({ results: [[{ transcript }]] }));
    fireEvent.click(screen.getByRole("button", { name: /crunch|extract/i }));
    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith(expect.any(Object), "mock", expectedSource));
  });

  it("refuses an over-cap transcript, shows the current count, and disables the mic near the cap", async () => {
    installSpeech();
    const nearCap = "x".repeat(4950);
    const { unmount } = renderInterview({ draft: nearCap });
    const mic = await screen.findByRole("button", { name: /speak|mic|voice/i });
    expect(mic).toBeDisabled();
    expect(screen.getByText(/4950\s*\/\s*5000/)).toBeInTheDocument();
    unmount();

    renderInterview({ draft: "x".repeat(4940) });
    const activeMic = await screen.findByRole("button", { name: /speak|mic|voice/i });
    fireEvent.click(activeMic);
    act(() => recognition?.onresult?.({ results: [[{ transcript: "y".repeat(100) }]] }));
    expect(screen.getByRole("alert")).toHaveTextContent(/5000|too long|maximum/i);
    expect(screen.getByLabelText(/family|tell us|interview/i)).toHaveValue("x".repeat(4940));
  });

  it("shows typed over-cap errors without truncating and keeps typed entry usable without speech", () => {
    renderInterview({ draft: "Typed entry works" });
    expect(screen.queryByRole("button", { name: /speak|mic|voice/i })).not.toBeInTheDocument();
    const input = screen.getByLabelText(/family|tell us|interview/i);
    fireEvent.change(input, { target: { value: "x".repeat(5001) } });
    expect(input).toHaveValue("x".repeat(5001));
    expect(screen.getByRole("alert")).toHaveTextContent(/5000|too long|maximum/i);
    expect(screen.getByRole("button", { name: /crunch|extract/i })).toBeDisabled();
  });

  it("stops speech recognition on unmount", async () => {
    installSpeech();
    const { unmount } = renderInterview({ draft: "A usable interview draft" });
    fireEvent.click(await screen.findByRole("button", { name: /speak|mic|voice/i }));
    unmount();
    expect(recognition?.stop).toHaveBeenCalled();
  });
});
