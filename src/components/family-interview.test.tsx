import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_CAREGIVER_TEXT, schoolAgeFamilyState } from "@/domain/family-fixtures";
import { FamilyInterview } from "./family-interview";

const { push, requestFamilyInterview } = vi.hoisted(() => ({ push: vi.fn(), requestFamilyInterview: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/ai/family-interview-provider", () => ({ requestFamilyInterview }));

type FakeSpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type FakeResult = { results: ArrayLike<FakeSpeechResult>; resultIndex?: number };
type RecognitionInstance = {
  onresult: ((event: FakeResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

let recognition: RecognitionInstance | undefined;

function speechResult(transcript: string, isFinal = true): FakeResult {
  return { results: [Object.assign([{ transcript }], { isFinal })] };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

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
    profile: schoolAgeFamilyState.profile!,
    draft: SAMPLE_CAREGIVER_TEXT,
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
    fireEvent.click(screen.getByRole("button", { name: /find help/i }));

    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
    expect(onExtracted.mock.calls[0][0].domains.map(({ domain }: { domain: string }) => domain)).toEqual([
      "school_iep",
      "waivers_financial",
      "parent_support"
    ]);
    expect(onExtracted.mock.calls[0].slice(1)).toEqual([
      { extraction: "mock", source: "typed", rawText: SAMPLE_CAREGIVER_TEXT }
    ]);
  });

  it("falls back locally when the provider throws and sanitizes unsafe live rationales", async () => {
    requestFamilyInterview.mockRejectedValueOnce(new Error("unexpected"));
    const onExtracted = vi.fn();
    renderInterview({ onExtracted });
    fireEvent.click(screen.getByRole("button", { name: /find help/i }));
    await waitFor(() =>
      expect(onExtracted).toHaveBeenCalledWith(expect.any(Object), {
        extraction: "mock",
        source: "typed",
        rawText: SAMPLE_CAREGIVER_TEXT
      })
    );

    requestFamilyInterview.mockResolvedValueOnce({
      facts: [],
      domains: [{ domain: "school_iep", rationale: "Riley has dyslexia." }],
      followUps: []
    });
    fireEvent.click(screen.getByRole("button", { name: /find help/i }));
    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(2));
    expect(onExtracted.mock.calls[1]).toEqual([
      { facts: [], domains: [{ domain: "school_iep" }], followUps: [] },
      { extraction: "live", source: "typed", rawText: SAMPLE_CAREGIVER_TEXT }
    ]);
  });

  it("sanitizes live follow-ups and keeps safe questions with chips", async () => {
    requestFamilyInterview.mockResolvedValueOnce({
      facts: [],
      domains: [{ domain: "school_iep" }],
      followUps: [
        { question: "Does Riley have autism?", options: ["Maybe"] },
        { question: "Would First Steps help?", options: ["Maybe"] },
        { question: "What has the teacher noticed?", options: ["Nothing yet", "Reading is hard"] }
      ]
    });
    const onExtracted = vi.fn();
    renderInterview({ onExtracted });

    fireEvent.click(screen.getByRole("button", { name: /find help/i }));

    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
    expect(onExtracted.mock.calls[0][0].followUps).toEqual([
      { question: "What has the teacher noticed?", options: ["Nothing yet", "Reading is hard"] }
    ]);
  });

  it("drops an unsupported live diagnosis fact even when its source snippet is verbatim", async () => {
    requestFamilyInterview.mockResolvedValueOnce({
      facts: [
        { label: "Grade", value: "second grade", sourceSnippet: "second grade" },
        { label: "Reported diagnosis", value: "autism", sourceSnippet: "second grade" },
        { label: "Observation", value: "autism", sourceSnippet: "second grade" },
        {
          label: "Reported diagnosis",
          value: "dyslexia",
          sourceSnippet: "He was just diagnosed with dyslexia"
        },
        {
          label: "About school and learning",
          value: "School and learning may need support",
          sourceSnippet: "reading is really hard for him"
        }
      ],
      domains: [{ domain: "school_iep", rationale: "The caregiver described school concerns." }],
      followUps: []
    });
    const onExtracted = vi.fn();
    renderInterview({
      profile: {
        ...schoolAgeFamilyState.profile!,
        diagnoses: [...schoolAgeFamilyState.profile!.diagnoses, { id: "profile-autism", label: "autism" }]
      },
      onExtracted
    });

    fireEvent.click(screen.getByRole("button", { name: /find help/i }));

    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
    expect(onExtracted.mock.calls[0][0].facts).toEqual([
      { label: "Grade", value: "second grade", sourceSnippet: "second grade" },
      {
        label: "Reported diagnosis",
        value: "dyslexia",
        sourceSnippet: "He was just diagnosed with dyslexia"
      },
      {
        label: "About school and learning",
        value: "School and learning may need support",
        sourceSnippet: "reading is really hard for him"
      }
    ]);
  });

  it.each([
    "honestly she's been saying she wants to die",
    "mi hija dice que quiere morir",
    "quiero morir",
    "me quiero matar",
    "ya no quiero vivir",
    "mi hijo dice que ya no quiere vivir",
    "mi hija se está cortando",
    "I have chest pain and cannot breathe",
    "There is no food today"
  ])("raises the safety banner and keeps the turn on-device: %s", async (text) => {
    const onExtracted = vi.fn();
    const onSafetyEscalation = vi.fn();
    renderInterview({ draft: text, onExtracted, onSafetyEscalation });
    fireEvent.click(screen.getByRole("button", { name: /find help/i }));

    await waitFor(() => expect(onSafetyEscalation).toHaveBeenCalledTimes(1));
    expect(onSafetyEscalation.mock.calls[0][0]).toMatchObject({ matched: true });
    // The disclosure never leaves the device, and the conversation continues:
    // extraction still runs, on the deterministic local path.
    expect(requestFamilyInterview).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
    expect(onExtracted.mock.calls[0][1]).toMatchObject({ extraction: "mock", rawText: text });
  });

  it("uses compile-enforced family strings for its static chrome", () => {
    renderInterview({ draft: "A usable family interview" });

    expect(screen.getByLabelText("What would you like help with?")).toBeVisible();
    expect(screen.getByRole("button", { name: "Find help" })).toBeVisible();
    expect(screen.getByText("25 of 5000 characters")).toBeVisible();
  });

  it("appends repeated final speech transcripts with one space and never auto-submits", async () => {
    installSpeech();
    const onDraftChange = vi.fn();
    const onExtracted = vi.fn();
    renderInterview({ draft: "Existing words", onDraftChange, onExtracted });
    const mic = await screen.findByRole("button", { name: /start speaking|stop listening/i });
    fireEvent.click(mic);

    act(() => recognition?.onresult?.(speechResult("first final")));
    act(() => recognition?.onresult?.(speechResult("second final")));

    expect(screen.getByLabelText(/what would you like help with/i)).toHaveValue("Existing words first final second final");
    expect(onDraftChange).toHaveBeenLastCalledWith("Existing words first final second final");
    expect(requestFamilyInterview).not.toHaveBeenCalled();
    expect(onExtracted).not.toHaveBeenCalled();
  });

  it("ignores a browser replay of the same final speech result index", async () => {
    installSpeech();
    const onDraftChange = vi.fn();
    renderInterview({ draft: "Existing words", onDraftChange });
    fireEvent.click(await screen.findByRole("button", { name: /start speaking|stop listening/i }));
    const repeatedFinal = speechResult("one final phrase");

    act(() => recognition?.onresult?.(repeatedFinal));
    act(() => recognition?.onresult?.(repeatedFinal));

    expect(screen.getByLabelText(/what would you like help with/i)).toHaveValue(
      "Existing words one final phrase"
    );
    expect(onDraftChange).toHaveBeenCalledTimes(1);
  });

  it("ignores interim speech results", async () => {
    installSpeech();
    renderInterview({ draft: "Existing words" });
    fireEvent.click(await screen.findByRole("button", { name: /start speaking|stop listening/i }));
    act(() => recognition?.onresult?.(speechResult("not final", false)));
    expect(screen.getByLabelText(/what would you like help with/i)).toHaveValue("Existing words");
  });

  it.each([
    ["", "This came from the microphone", "voice"],
    ["Existing typed words", "then the microphone", "mixed"]
  ])("emits %s plus speech with %s provenance", async (draft, transcript, expectedSource) => {
    installSpeech();
    const onExtracted = vi.fn();
    renderInterview({ draft, onExtracted });
    fireEvent.click(await screen.findByRole("button", { name: /start speaking|stop listening/i }));
    act(() => recognition?.onresult?.(speechResult(transcript)));
    fireEvent.click(screen.getByRole("button", { name: /find help/i }));
    await waitFor(() =>
      expect(onExtracted).toHaveBeenCalledWith(expect.any(Object), {
        extraction: "mock",
        source: expectedSource,
        rawText: draft ? `${draft} ${transcript}` : transcript
      })
    );
  });

  it("refuses an over-cap transcript, shows the current count, and disables the mic near the cap", async () => {
    installSpeech();
    const nearCap = "x".repeat(4950);
    const { unmount } = renderInterview({ draft: nearCap });
    const mic = await screen.findByRole("button", { name: /start speaking|stop listening/i });
    expect(mic).toBeDisabled();
    expect(screen.getByText("4950 of 5000 characters")).toBeInTheDocument();
    unmount();

    renderInterview({ draft: "x".repeat(4940) });
    const activeMic = await screen.findByRole("button", { name: /start speaking|stop listening/i });
    fireEvent.click(activeMic);
    act(() => recognition?.onresult?.(speechResult("y".repeat(100))));
    expect(screen.getByRole("alert")).toHaveTextContent(/5000|too long|maximum/i);
    expect(screen.getByLabelText(/what would you like help with/i)).toHaveValue("x".repeat(4940));
  });

  it("shows typed over-cap errors without truncating and keeps typed entry usable without speech", () => {
    renderInterview({ draft: "Typed entry works" });
    expect(screen.queryByRole("button", { name: /start speaking|stop listening/i })).not.toBeInTheDocument();
    const input = screen.getByLabelText(/what would you like help with/i);
    fireEvent.change(input, { target: { value: "x".repeat(5001) } });
    expect(input).toHaveValue("x".repeat(5001));
    expect(screen.getByRole("alert")).toHaveTextContent(/5000|too long|maximum/i);
    expect(screen.getByRole("button", { name: /find help/i })).toBeDisabled();
  });

  it("stops speech recognition on unmount", async () => {
    installSpeech();
    const { unmount } = renderInterview({ draft: "A usable interview draft" });
    fireEvent.click(await screen.findByRole("button", { name: /start speaking|stop listening/i }));
    const lateResult = recognition?.onresult;
    unmount();
    expect(recognition?.stop).toHaveBeenCalled();
    expect(recognition?.onresult).toBeNull();
    expect(recognition?.onerror).toBeNull();
    expect(recognition?.onend).toBeNull();
    act(() => lateResult?.(speechResult("late final")));
  });

  it("freezes one atomic mixed-source submission and ignores edits or late speech while pending", async () => {
    installSpeech();
    const liveResult = {
      facts: [{ label: "Grade", value: "fourth grade", sourceSnippet: "fourth grade" }],
      domains: [{ domain: "school_iep" as const, rationale: "Riley has dyslexia." }],
      followUps: []
    };
    const pending = deferred<typeof liveResult | null>();
    requestFamilyInterview.mockReturnValueOnce(pending.promise);
    const onDraftChange = vi.fn();
    const onExtracted = vi.fn();
    renderInterview({ draft: "Existing fourth grade", onDraftChange, onExtracted });
    fireEvent.click(await screen.findByRole("button", { name: /start speaking|stop listening/i }));
    act(() => recognition?.onresult?.(speechResult("spoken concern")));
    const rawText = "Existing fourth grade spoken concern";
    const lateResult = recognition?.onresult;

    fireEvent.click(screen.getByRole("button", { name: /find help/i }));
    expect(screen.getByRole("textbox", { name: /what would you like help with/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /start speaking|stop listening/i })).toBeDisabled();
    expect(recognition?.stop).toHaveBeenCalledTimes(1);
    expect(recognition?.onresult).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: /what would you like help with/i }), { target: { value: "changed while pending" } });
    act(() => lateResult?.(speechResult("late final")));
    expect(screen.getByRole("textbox", { name: /what would you like help with/i })).toHaveValue(rawText);

    await act(async () => pending.resolve(liveResult));
    await waitFor(() =>
      expect(onExtracted).toHaveBeenCalledWith(
        { facts: liveResult.facts, domains: [{ domain: "school_iep" }], followUps: [] },
        { extraction: "live", source: "mixed", rawText }
      )
    );
    expect(requestFamilyInterview).toHaveBeenCalledTimes(1);
    expect(requestFamilyInterview).toHaveBeenCalledWith(expect.objectContaining({ text: rawText }));
    expect(onExtracted).toHaveBeenCalledTimes(1);
    expect(onDraftChange).toHaveBeenLastCalledWith(rawText);
  });

  it("guards a rapid double submit with one provider request and one callback", async () => {
    const pending = deferred<null>();
    requestFamilyInterview.mockReturnValueOnce(pending.promise);
    const onExtracted = vi.fn();
    renderInterview({ onExtracted });
    const form = screen.getByLabelText(/what would you like help with/i).closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(requestFamilyInterview).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve(null));
    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
    expect(onExtracted).toHaveBeenCalledWith(expect.any(Object), {
      extraction: "mock",
      source: "typed",
      rawText: SAMPLE_CAREGIVER_TEXT
    });
  });

  it("invalidates a pending submission when its external draft is replaced and reconciles the latest draft", async () => {
    const draftA = "Riley was diagnosed with dyslexia.";
    const draftB = "Casey is in grade 4.";
    const profileA = { ...schoolAgeFamilyState.profile!, childFirstName: "Riley" };
    const profileB = profileA;
    const pending = deferred<null>();
    requestFamilyInterview.mockReturnValueOnce(pending.promise);
    const onDraftChange = vi.fn();
    const onExtracted = vi.fn();
    const baseProps = {
      passcode: "secret",
      language: "en" as const,
      onDraftChange,
      onExtracted
    };
    const { rerender } = render(<FamilyInterview {...baseProps} draft={draftA} profile={profileA} />);

    fireEvent.click(screen.getByRole("button", { name: /find help/i }));
    rerender(<FamilyInterview {...baseProps} draft={draftB} profile={profileB} />);
    expect(screen.getByRole("textbox", { name: /what would you like help with/i })).toHaveValue(draftA);

    await act(async () => pending.resolve(null));
    await waitFor(() => expect(screen.getByRole("textbox", { name: /what would you like help with/i })).toHaveValue(draftB));
    expect(onExtracted).not.toHaveBeenCalled();
    expect(requestFamilyInterview.mock.calls[0][0]).toEqual(
      expect.objectContaining({ text: draftA, profile: profileA })
    );

    fireEvent.click(screen.getByRole("button", { name: /find help/i }));
    await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
    expect(requestFamilyInterview.mock.calls[1][0]).toEqual(
      expect.objectContaining({ text: draftB, profile: profileB })
    );
    expect(onExtracted.mock.calls[0]).toEqual([
      {
        facts: [
          { label: "Grade", value: "grade 4", sourceSnippet: "grade 4" },
          {
            label: "About school and learning",
            value: "School and learning may need support",
            sourceSnippet: draftB
          }
        ],
        domains: [{ domain: "school_iep", rationale: "You mentioned school, an IEP, or help with reading." }],
        followUps: [
          {
            question: "What has the school offered so far?",
            options: ["Nothing yet", "A meeting is planned", "An evaluation was done"]
          }
        ]
      },
      { extraction: "mock", source: "typed", rawText: draftB }
    ]);
  });

  it("invalidates a pending submission when the profile is replaced without changing the draft", async () => {
    const draft = "Riley is in fourth grade.";
    const profileA = { ...schoolAgeFamilyState.profile!, childFirstName: "Riley" };
    const profileB = { ...schoolAgeFamilyState.profile!, childFirstName: "Casey", county: "Perry" };
    const pending = deferred<null>();
    requestFamilyInterview.mockReturnValueOnce(pending.promise);
    const onExtracted = vi.fn();
    const baseProps = {
      draft,
      passcode: "secret",
      language: "en" as const,
      onDraftChange: vi.fn(),
      onExtracted
    };
    const { rerender } = render(<FamilyInterview {...baseProps} profile={profileA} />);

    fireEvent.click(screen.getByRole("button", { name: /find help/i }));
    rerender(<FamilyInterview {...baseProps} profile={profileB} />);
    await act(async () => pending.resolve(null));

    await waitFor(() => expect(screen.getByRole("button", { name: /find help/i })).toBeEnabled());
    expect(onExtracted).not.toHaveBeenCalled();
  });
});
