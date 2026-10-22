-- Home-page curated product sections are driven by categories (products are
-- linked via product_categories). Rename the existing best-seller section and
-- add the "Recommended for You" one. Slugs are kept stable for links.
UPDATE "categories" SET "name" = 'Best Selling Products' WHERE "slug" = 'best-seller';--> statement-breakpoint
INSERT INTO "categories" ("name", "slug", "sort_order")
VALUES ('Recommended for You', 'recommended-for-you', 3)
ON CONFLICT ("slug") DO NOTHING;
