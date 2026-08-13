import { z } from "zod";

// Plain YYYY-MM-DD (matches the pg `date` column — no time component, so an
// admin-picked calendar date stores/reads back exactly as chosen regardless
// of timezone).
export const setShipmentDateSchema = z.object({
  expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)"),
});

export type SetShipmentDateInput = z.infer<typeof setShipmentDateSchema>;
