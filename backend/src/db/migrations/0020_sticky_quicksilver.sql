CREATE TYPE "public"."faq_segment" AS ENUM('products', 'orders', 'delivery', 'returns');--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment" "faq_segment" NOT NULL,
	"question" varchar(300) NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "faq_items_segment_idx" ON "faq_items" USING btree ("segment");--> statement-breakpoint
CREATE INDEX "faq_items_sort_order_idx" ON "faq_items" USING btree ("sort_order");