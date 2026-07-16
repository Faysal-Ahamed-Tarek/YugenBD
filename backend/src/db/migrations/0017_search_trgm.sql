-- Custom SQL migration file, put your code below! --

-- Fuzzy product search: trigram similarity for typo tolerance ("shmpoo" → "Shampoo")
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_title_trgm_idx" ON "products" USING gin ("title" gin_trgm_ops);
