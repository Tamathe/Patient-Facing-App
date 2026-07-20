import { AUDIT_C_INSTRUMENT } from "./audit-c";
import { CRC_ELIGIBILITY_INSTRUMENT } from "./crc-eligibility";
import { DDS2_INSTRUMENT } from "./dds2";
import { GAD2_INSTRUMENT } from "./gad2";
import { GAD7_INSTRUMENT } from "./gad7";
import { HUNGER_VITAL_SIGN_INSTRUMENT } from "./hunger-vital-sign";
import { NIDA_SINGLE_INSTRUMENT } from "./nida-single";
import { LUNG_LDCT_ELIGIBILITY_INSTRUMENT } from "./lung-ldct-eligibility";
import { PHQ2_INSTRUMENT } from "./phq2";
import { PHQ9_INSTRUMENT } from "./phq9";
import { PREDIABETES_RISK_INSTRUMENT } from "./prediabetes-risk";
import { STEADI3_INSTRUMENT } from "./steadi3";
import { TOBACCO_USE_INSTRUMENT } from "./tobacco-use";
import type { ScreeningInstrument } from "./types";

export const INSTRUMENTS: Record<string, ScreeningInstrument> = {
  phq9: PHQ9_INSTRUMENT,
  phq2: PHQ2_INSTRUMENT,
  gad2: GAD2_INSTRUMENT,
  gad7: GAD7_INSTRUMENT,
  hunger_vital_sign: HUNGER_VITAL_SIGN_INSTRUMENT,
  tobacco_use: TOBACCO_USE_INSTRUMENT,
  nida_single: NIDA_SINGLE_INSTRUMENT,
  lung_ldct_eligibility: LUNG_LDCT_ELIGIBILITY_INSTRUMENT,
  crc_eligibility: CRC_ELIGIBILITY_INSTRUMENT,
  prediabetes_risk: PREDIABETES_RISK_INSTRUMENT,
  audit_c: AUDIT_C_INSTRUMENT,
  dds2: DDS2_INSTRUMENT,
  steadi3: STEADI3_INSTRUMENT
};

export function getInstrument(id: string): ScreeningInstrument | undefined {
  return Object.prototype.hasOwnProperty.call(INSTRUMENTS, id) ? INSTRUMENTS[id] : undefined;
}

export function isKnownInstrument(id: string): boolean {
  return getInstrument(id) !== undefined;
}
