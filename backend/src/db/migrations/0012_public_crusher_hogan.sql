CREATE TABLE "hero_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hero_slides_is_active_idx" ON "hero_slides" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "hero_slides_sort_order_idx" ON "hero_slides" USING btree ("sort_order");