CREATE TABLE "delivery_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"free_delivery_threshold" numeric(10, 2) DEFAULT '3000.00' NOT NULL,
	"always_free" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
