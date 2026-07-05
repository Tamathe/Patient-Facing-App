import { z } from "zod";

export const bpReadingInputSchema = z.object({
  systolic: z.coerce.number().int().min(70).max(260),
  diastolic: z.coerce.number().int().min(40).max(160),
  pulse: z.coerce.number().int().min(30).max(220).nullable(),
  contexts: z.array(
    z.enum(["morning", "evening", "before_medicine", "after_medicine", "after_coffee", "after_resting", "during_symptoms"])
  ).min(1),
  note: z.string().max(280)
}).superRefine((reading, ctx) => {
  if (reading.systolic <= reading.diastolic) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Systolic blood pressure must be greater than diastolic blood pressure.",
      path: ["systolic"]
    });
  }
});

export const medicationBarrierSchema = z.enum([
  "forgot",
  "ran_out",
  "cost",
  "side_effects",
  "confused",
  "scared",
  "pharmacy_issue",
  "does_not_feel_necessary"
]);

export const careContextInputSchema = z.object({
  title: z.string().min(2).max(80),
  rawText: z.string().trim().min(10).max(5000),
  sourceLabel: z.string().min(2).max(80)
});
