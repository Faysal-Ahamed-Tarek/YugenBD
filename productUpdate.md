# YugenBD — Shipping This Update to the VPS

How to push the current round of changes (subcategory system, category-image
removal, auth/rate-limit fixes) from your machine to production.

---

## ⚠️ Read first — production is partially broken until you deploy

Local and production share **the same Neon database**. The schema migrations in
this update (`0009` add `categories.parent_id`, `0010` drop `categories.image_url`)
have **already been applied to that shared DB** during local development.

The **deployed code on the VPS is still the old version**, which expects an
`image_url` column that no longer exists. Right now:

- `GET https://api.yugenbd.com/api/v1/categories` → **500 Internal Server Error**
- The storefront nav shows **no categories** (it degrades gracefully to empty)
- The admin **Categories** page errors

Everything else (products, orders, etc.) is unaffected. **Deploying the new code
fixes it** — the new code matches the current schema. Do this now.

---

## What's in this update

| Area | Change |
|---|---|
| Backend | `categories.parent_id` (self-FK, one-level nesting); `GET /categories` returns a nested tree (`?flat=true` for the old list); parent-slug product filtering rolls up children; `image_url` removed from categories |
| Admin | Categories page shows nested tree + "＋ Subcategory" + Parent dropdown; product form category picker shows the tree; **category image upload removed** |
| Storefront | Header hover-dropdown + mobile expandable subcategories; `/category/[slug]` subcategory filter chips (`?subcategory=`) + parent/child breadcrumbs |
| Fixes | Admin infinite `/auth/refresh` loop fixed; rate limiting skipped in dev |
| DB migrations | `0009_fast_unicorn.sql`, `0010_sad_songbird.sql` (already applied to Neon) |

---

## Step 1 — On your machine: commit & push

```bash
cd /home/faysal/Desktop/YugenBD

git status                      # review what's changing
git add -A                      # includes the new 0009/0010 migration files
git commit -m "Subcategories + remove category images + auth/rate-limit fixes"
git push origin main
```

> Make sure the two new migration files and their `meta/*_snapshot.json` are in
> the commit — the repo must carry them even though the DB already has them.
> Confirm no real secrets are staged (only `*.env.example` should ever be tracked).

---

## Step 2 — On the VPS: pull & deploy

SSH in and run the existing one-command deploy script from the repo root:

```bash
ssh deploy@YOUR_VPS_IP
cd ~/yugenbd
bash deploy/deploy.sh
```

`deploy/deploy.sh` runs, in order:

1. `git pull --ff-only`
2. **backend**: `npm ci` → `npm run db:migrate` → `npm run build`
3. **frontend**: `npm ci` → `npm run build`
4. **admin**: `npm ci` → `npm run build`
5. `pm2 reload ecosystem.config.js --update-env` → `pm2 save`

### About the migrations
`npm run db:migrate` reads Drizzle's journal from the DB. Because `0009` and
`0010` are **already applied** to the shared Neon DB, this step is a **no-op** —
it applies nothing and does not error. Safe to run.

### If you prefer manual steps instead of the script
```bash
cd ~/yugenbd && git pull --ff-only
cd backend  && npm ci && npm run db:migrate && npm run build && cd ..
cd frontend && npm ci && npm run build && cd ..
cd admin    && npm ci && npm run build && cd ..
pm2 reload ecosystem.config.js --update-env && pm2 save
```

---

## Step 3 — Verify production is healthy

```bash
# categories now returns 200 (the fix)
curl -s -o /dev/null -w "categories: %{http_code}\n" https://api.yugenbd.com/api/v1/categories
# should be [] (empty) since the catalog was cleared — NOT a 500
curl -s https://api.yugenbd.com/api/v1/categories

curl -s -o /dev/null -w "products: %{http_code}\n"  "https://api.yugenbd.com/api/v1/products?limit=1"
pm2 status                       # all three apps "online"
```

In a browser:
- `https://yugenbd.com` — storefront loads (nav empty until you add categories).
- `https://hTdQ8yNsC3r.yugenbd.com` — log in, open **Categories**: page loads with
  the tree UI and no image field; add a top-level category, then a subcategory.

Because the catalog is currently empty, the real test is: add a parent + child +
a product, then confirm the header dropdown, `/category/<parent>` filter chips,
and the parent→children product rollup all work.

---

## Notes & gotchas

- **`NEXT_PUBLIC_*` didn't change**, but the storefront/admin still need a rebuild
  for the new code — `deploy.sh` rebuilds all three, so nothing extra to do.
- **Admin login password** is `Rz6#mVbK9tXpL2q` (both admins) after the reseed.
- **Rate-limit skip is dev-only** (`NODE_ENV !== "production"`). Production keeps
  full rate limiting — no change to prod protection.
- **Don't run `npm run seed`** — it would repopulate demo data and reset the admin
  accounts. You're adding real content by hand.

## Rollback (only if a deploy breaks something)

```bash
cd ~/yugenbd
git log --oneline -5
git reset --hard <previous_good_sha>
bash deploy/deploy.sh
```

⚠️ Rolling back the **code** does **not** undo the DB migrations. The old code
expects `categories.image_url`, which is gone — so a full rollback would
re-break `/categories`. If you must roll back, restore the column first:
```sql
ALTER TABLE categories ADD COLUMN image_url varchar(500);
```
(or restore from a Neon branch/snapshot taken before the change). In practice,
rolling *forward* — fixing and redeploying — is the safer path here.
