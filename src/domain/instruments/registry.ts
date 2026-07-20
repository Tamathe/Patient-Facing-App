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
import { PHQ_A_INSTRUMENT } from "./phq-a";
import { PSC17_INSTRUMENT } from "./psc17";
import { PREDIABETES_RISK_INSTRUMENT } from "./prediabetes-risk";
import { STEADI3_INSTRUMENT } from "./steadi3";
import { TOBACCO_USE_INSTRUMENT } from "./tobacco-use";
import { SWYC_18MO_INSTRUMENT } from "./swyc-milestones-18mo";
import { SWYC_30MO_INSTRUMENT } from "./swyc-milestones-30mo";
import { SWYC_POSI_INSTRUMENT } from "./swyc-posi";
import type { ScreeningInstrument } from "./types";

// EPDS is deferred pending the RCPsych electronic-use permission gate.

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
  steadi3: STEADI3_INSTRUMENT,
  swyc_18mo: SWYC_18MO_INSTRUMENT,
  swyc_30mo: SWYC_30MO_INSTRUMENT,
  swyc_posi: SWYC_POSI_INSTRUMENT,
  psc17: PSC17_INSTRUMENT,
  phq_a: PHQ_A_INSTRUMENT
};

export function getInstrument(id: string): ScreeningInstrument | undefined {
  return Object.prototype.hasOwnProperty.call(INSTRUMENTS, id) ? INSTRUMENTS[id] : undefined;
}

export function isKnownInstrument(id: string): boolean {
  return getInstrument(id) !== undefined;
}
