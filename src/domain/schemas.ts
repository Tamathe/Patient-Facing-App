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

export const barcodeSchema = z.string().regex(/^\d{8,14}$/);

const nullableNumber = z.number().finite().nullable();

export const nutritionFactsSchema = z.object({
  servingSize: z.string(),
  calories: nullableNumber,
  sodiumMg: nullableNumber,
  potassiumMg: nullableNumber,
  totalSugarsG: nullableNumber,
  addedSugarsG: nullableNumber,
  saturatedFatG: nullableNumber,
  fiberG: nullableNumber,
  proteinG: nullableNumber,
  carbsG: nullableNumber
});

export const identifiedFoodSchema = z.object({
  id: z.string().min(1),
  barcode: z.string().nullable(),
  name: z.string().min(1),
  brand: z.string().nullable(),
  category: z.string().nullable(),
  nutrition: nutritionFactsSchema.nullable(),
  source: z.enum(["barcode_off", "barcode_fdc", "barcode_seed", "vision_estimate"])
});

export const foodLookupResponseSchema = z.discriminatedUnion("found", [
  z.object({ found: z.literal(true), food: identifiedFoodSchema }),
  z.object({ found: z.literal(false) })
]);

export const mealLogEntrySchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  loggedAt: z.string().min(1),
  food: identifiedFoodSchema,
  flags: z.array(z.string()),
  assistantSummary: z.string().max(280)
});
