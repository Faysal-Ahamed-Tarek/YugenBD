CREATE TABLE "concerns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_concerns" (
	"product_id" uuid NOT NULL,
	"concern_id" uuid NOT NULL,
	CONSTRAINT "product_concerns_product_id_concern_id_pk" PRIMARY KEY("product_id","concern_id")
);
--> statement-breakpoint
ALTER TABLE "product_concerns" ADD CONSTRAINT "product_concerns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concerns" ADD CONSTRAINT "product_concerns_concern_id_concerns_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concerns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "concerns_slug_idx" ON "concerns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_concerns_concern_id_idx" ON "product_concerns" USING btree ("concern_id");