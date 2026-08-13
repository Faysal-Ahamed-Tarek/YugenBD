CREATE TABLE "shipment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expected_date" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
