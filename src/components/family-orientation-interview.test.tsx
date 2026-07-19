import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { morganFamilyState } from "@/domain/family-fixtures";
import type { FamilyFollowUp, FamilyInterviewResult } from "@/domain/family-interview";
import { FamilyOrientationInterview } from "./family-orientation-interview";

const { extractFamilyInterviewMock, push, requestFamilyInterview } = vi.hoisted(() => ({
  extractFamilyInterviewMock: vi.fn(),
  push: vi.fn(),
  requestFamilyInterview: vi.fn()
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/ai/family-interview-provider", () => ({ requestFamilyInterview }));
vi.mock("@/domain/family-interview", async () => {
  const actual = await vi.importActual<typeof import("@/domain/family-interview")>("@/domain/family-interview");
  return {
    ...actual,
    extractFamilyInterviewMock: (...args: Parameters<typeof actual.extractFamilyInterviewMock>) => {
      extractFamilyInterviewMock(...args);
      return actual.extractFamilyInterviewMock(...args);
    }
  };
});

const schoolQuestion: FamilyFollowUp = {
  question: "What has the school offered so far?",
  options: ["Nothing yet", "A meeting is planned", "An evaluation was done"]
};
const waiverQuestion: FamilyFollowUp = {
  question: "Have you applied for any state programs yet?",
  options: ["Not yet", "Applied, still waiting", "Not sure"]
};
const helperQuestion: FamilyFollowUp = {
  question: "Who can take over for a few hours?",
  options: ["No one right now", "Family sometimes", "A paid helper"]
};

function result(followUps: FamilyFollowUp[], domain: "school_iep" | "waivers_financial" = "school_iep"): FamilyInterviewResult {
  return {
    facts: [],
    domains: [{ domain, rationale: "The caregiver described a support need." }],
    followUps
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function renderOrientation(overrides: Partial<React.ComponentProps<typeof FamilyOrientationInterview>> = {}) {
  const props: React.ComponentProps<typeof FamilyOrientationInterview> = {
    profile: morganFamilyState.profile!,
    draft: morganFamilyState.interviewDraft,
    passcode: "secret",
    language: "en",
    onDraftChange: vi.fn(),
    onInterviewExtracted: vi.fn(),
    onSafetyEscalation: vi.fn(),
    ...overrides
  };
  return { ...render(<FamilyOrientationInterview {...props} />), props };
}

async function submitOpening(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /find support areas/i }));
  await screen.findByRole("heading", { name: schoolQuestion.question });
}

beforeEach(() => {
  extractFamilyInterviewMock.mockClear();
  push.mockClear();
  requestFamilyInterview.mockReset();
});

describe("FamilyOrientationInterview", () => {
  it("submits a chip answer with cumulative live and family-only transcripts", async () => {
    requestFamilyInterview.mockResolvedValueOnce(result([schoolQuestion])).mockResolvedValueOnce(result([]));
    const onInterviewExtracted = vi.fn();
    renderOrientation({ onInterviewExtracted });
    await submitOpening();

    fireEvent.click(screen.getByRole("button", { name: "Nothing yet" }));

    const fullTranscript = `${morganFamilyState.interviewDraft}\nQ: ${schoolQuestion.question}\nA: Nothing yet`;
    const familyOnlyTranscript = `${morganFamilyState.interviewDraft}\nNothing yet`;
    await waitFor(() => expect(requestFamilyInterview).toHaveBeenCalledTimes(2));
    expect(requestFamilyInterview.mock.calls[1][0]).toEqual(
      expect.objectContaining({ text: fullTranscript, profile: morganFamilyState.profile, language: "en" })
    );
    await waitFor(() => expect(onInterviewExtracted).toHaveBeenCalledTimes(2));
    expect(onInterviewExtracted.mock.calls[1][1]).toEqual({
      extraction: "live",
      source: "typed",
      rawText: familyOnlyTranscript
    });
    expect(onInterviewExtracted.mock.calls[1][2]).toEqual({ round: 1 });
  });

  it("accepts a typed answer shorter than the opening interview minimum", async () => {
    requestFamilyInterview.mockResolvedValueOnce(result([schoolQuestion])).mockResolvedValueOnce(result([]));
    const onInterviewExtracted = vi.fn();
    renderOrientation({ onInterviewExtracted });
    await submitOpening();

    fireEvent.change(screen.getByRole("textbox", { name: "Or type a short answer" }), { target: { value: "No" } });
    fireEvent.click(screen.getByRole("button", { name: "Add answer" }));

    await waitFor(() => expect(onInterviewExtracted).toHaveBeenCalledTimes(2));
    expect(requestFamilyInterview.mock.calls[1][0].text).toMatch(/\nA: No$/);
  });

  it("safety-gates every follow-up answer before a network request", async () => {
    requestFamilyInterview.mockResolvedValueOnce(result([schoolQuestion]));
    const onSafetyEscalation = vi.fn();
    renderOrientation({ onSafetyEscalation });
    await submitOpening();

    const crisisText = "I am going to kill myself tonight";
    fireEvent.change(screen.getByRole("textbox", { name: "Or type a short answer" }), { target: { value: crisisText } });
    fireEvent.click(screen.getByRole("button", { name: "Add answer" }));

    expect(onSafetyEscalation).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(`/chat?ask=${encodeURIComponent(crisisText)}`);
    expect(requestFamilyInterview).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /find support areas/i })).toBeInTheDocument();
  });

  it("uses family-only text for the mock fallback and advances to its next safe question", async () => {
    requestFamilyInterview.mockResolvedValueOnce(result([schoolQuestion])).mockResolvedValueOnce(null);
    renderOrientation();
    await submitOpening();

    fireEvent.click(screen.getByRole("button", { name: "Nothing yet" }));

    const familyOnlyTranscript = `${morganFamilyState.interviewDraft}\nNothing yet`;
    await screen.findByRole("heading", { name: waiverQuestion.question });
    expect(extractFamilyInterviewMock).toHaveBeenCalledWith(
      familyOnlyTranscript,
      morganFamilyState.profile,
      expect.any(Date),
      "en"
    );
  });

  it("deduplicates already-asked questions exactly", async () => {
    requestFamilyInterview
      .mockResolvedValueOnce(result([schoolQuestion]))
      .mockResolvedValueOnce(result([schoolQuestion, waiverQuestion], "waivers_financial"));
    renderOrientation();
    await submitOpening();

    fireEvent.click(screen.getByRole("button", { name: "Nothing yet" }));

    await screen.findByRole("heading", { name: waiverQuestion.question });
    expect(screen.getAllByText(schoolQuestion.question)).toHaveLength(1);
  });

  it("stops after two follow-up rounds even when another question is returned", async () => {
    requestFamilyInterview
      .mockResolvedValueOnce(result([schoolQuestion]))
      .mockResolvedValueOnce(result([waiverQuestion], "waivers_financial"))
      .mockResolvedValueOnce(result([helperQuestion]));
    const onInterviewExtracted = vi.fn();
    renderOrientation({ onInterviewExtracted });
    await submitOpening();

    fireEvent.click(screen.getByRole("button", { name: "Nothing yet" }));
    await screen.findByRole("heading", { name: waiverQuestion.question });
    fireEvent.click(screen.getByRole("button", { name: "Not yet" }));

    await screen.findByText("Thanks. We have enough to orient your next steps.");
    expect(screen.queryByRole("heading", { name: helperQuestion.question })).not.toBeInTheDocument();
    expect(onInterviewExtracted).toHaveBeenCalledTimes(3);
  });

  it("ends gracefully before offering a question without enough transcript headroom", async () => {
    const nearLimit = "x".repeat(4293);
    requestFamilyInterview.mockResolvedValueOnce(result([schoolQuestion]));
    renderOrientation({ draft: nearLimit });

    fireEvent.click(screen.getByRole("button", { name: /find support areas/i }));

    await screen.findByText("Thanks. We have enough to orient your next steps.");
    expect(screen.queryByRole("heading", { name: schoolQuestion.question })).not.toBeInTheDocument();
    expect(requestFamilyInterview).toHaveBeenCalledTimes(1);
  });

  it("guards against double submission while a follow-up request is pending", async () => {
    const pending = deferred<FamilyInterviewResult | null>();
    requestFamilyInterview.mockResolvedValueOnce(result([schoolQuestion])).mockReturnValueOnce(pending.promise);
    renderOrientation();
    await submitOpening();

    const chip = screen.getByRole("button", { name: "Nothing yet" });
    fireEvent.click(chip);
    fireEvent.click(chip);

    expect(requestFamilyInterview).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(result([])));
    await screen.findByText("Thanks. We have enough to orient your next steps.");
  });
});
