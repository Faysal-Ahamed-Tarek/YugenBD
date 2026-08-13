import { z } from "zod";

export const updateDeliverySettingsSchema = z.object({
  // Subtotal (BDT) at or above which delivery is free. Capped well above any
  // realistic cart so a typo can't silently disable free delivery forever.
  freeDeliveryThreshold: z.number().nonnegative("Enter a valid amount").max(1_000_000),
  // When true, EVERY order ships free regardless of the threshold.
  alwaysFree: z.boolean(),
});

export type UpdateDeliverySettingsInput = z.infer<typeof updateDeliverySettingsSchema>;
