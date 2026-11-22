ALTER TABLE "reviews" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "review_images" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reviewer_image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "featured_order" integer;--> statement-breakpoint
CREATE INDEX "reviews_is_featured_idx" ON "reviews" USING btree ("is_featured");