import { z } from "zod";

// Shipping details: division → district → upazila (all required) + address line 1.
export const saveAddressSchema = z.object({
  divisionId: z.string().uuid("Select a division"),
  districtId: z.string().uuid("Select a district"),
  upazilaId: z.string().uuid("Select an upazila"),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
  addressLine1: z.string().trim().min(3, "Address line 1 is required").max(255),
});

export type SaveAddressInput = z.infer<typeof saveAddressSchema>;
