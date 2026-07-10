CREATE TABLE "testimonial_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"video_url" varchar(500) NOT NULL,
	"poster_url" varchar(500) NOT NULL,
	"order_id" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "testimonial_videos_is_active_idx" ON "testimonial_videos" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "testimonial_videos_order_id_idx" ON "testimonial_videos" USING btree ("order_id");