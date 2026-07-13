DROP TABLE "product_weights" CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "weight_label";--> statement-breakpoint
DROP TYPE "public"."weight_unit";