import { z } from "zod";

// Bangladeshi mobile number, local format: 01XXXXXXXXX (11 digits).
const bdPhone = /^01[3-9]\d{8}$/;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Customer self-registration (storefront). Email is required. Location fields
 * (division → district → upazila + area) seed the customer's default shipping
 * address so their dashboard is prefilled.
 */
export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(150),
  phone: z.string().trim().regex(bdPhone, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  divisionId: z.string().uuid("Select a division"),
  districtId: z.string().uuid("Select a district"),
  upazilaId: z.string().uuid("Select an upazila / thana"),
  area: z.string().trim().min(3, "Area is required").max(255),
});

/** Customer login by mobile number OR email + password. */
export const customerLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your mobile number or email"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
