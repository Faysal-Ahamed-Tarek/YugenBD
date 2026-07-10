CREATE TYPE "public"."weight_unit" AS ENUM('ml', 'g', 'l', 'kg', 'pcs');--> statement-breakpoint
CREATE TABLE "product_weights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"unit" "weight_unit" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "weight_label" varchar(50);--> statement-breakpoint
ALTER TABLE "product_weights" ADD CONSTRAINT "product_weights_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_weights_product_id_idx" ON "product_weights" USING btree ("product_id");