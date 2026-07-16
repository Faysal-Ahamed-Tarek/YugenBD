ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Grandfather accounts created before email verification existed (customers
-- and admins alike) so nobody gets locked out of logging in.
UPDATE "users" SET "email_verified" = true;