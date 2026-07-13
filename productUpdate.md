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