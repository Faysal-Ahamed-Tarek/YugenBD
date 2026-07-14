import { z } from "zod";

// Bangladeshi mobile number, local format: 01XXXXXXXXX (11 digits).
const bdPhone = /^01[3-9]\d{8}$/;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

/** Customer self-registration (storefront). Email is optional. */
export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(150),
  phone: z.string().trim().regex(bdPhone, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

/** Customer login is by phone number + password. */
export const customerLoginSchema = z.object({
  phone: z.string().trim().regex(bdPhone, "Enter a valid Bangladeshi mobile number"),
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
