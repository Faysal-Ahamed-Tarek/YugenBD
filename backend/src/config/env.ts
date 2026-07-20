import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  // Comma-separated list of allowed origins (storefront + admin app).
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://localhost:3001"),
  // Storefront base URL used in emails (password-reset links).
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  // SMTP for transactional email (Gmail: use an App Password). When SMTP_USER
  // or SMTP_PASS is missing, emails are logged to the console instead of sent
  // (dev convenience) — production must configure both.
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Inbox that receives a notification for every customer order. Defaults to
  // the shop's own Gmail — the same account SMTP authenticates as.
  ORDER_NOTIFICATION_EMAIL: z.string().email().default("bdyugen@gmail.com"),
  ADMIN1_NAME: z.string().default("Faysal"),
  ADMIN1_EMAIL: z.string().email().default("faysal.ahamed.tarek1@gmail.com"),
  ADMIN1_PASSWORD: z.string().min(8).default("Rz6#mVbK9tXpL2q"),
  ADMIN2_NAME: z.string().default("Tanvir"),
  ADMIN2_EMAIL: z.string().email().default("tanvirjp123@gmail.com"),
  ADMIN2_PASSWORD: z.string().min(8).default("Wf4!hTdQ8yNsC3r"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
