"use client";

import React from "react";
import { PHQ9_INSTRUMENT } from "@/domain/instruments/phq9";
import type { Language } from "@/i18n/strings";
import { InstrumentRunner } from "./instrument-runner";

export function Phq9CheckIn({
  language,
  onComplete
}: {
  language: Language;
  onComplete: (itemResponses: number[]) => void;
}) {
  return <InstrumentRunner instrument={PHQ9_INSTRUMENT} language={language} onComplete={onComplete} />;
}
