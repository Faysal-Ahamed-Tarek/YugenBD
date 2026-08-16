# YugenBD — Production Update Runbook

How to ship a code change to the live server. The one-time VPS build-out (DNS,
Node/PM2/Nginx install, Certbot, firewall, first seed) is **not** here — it lives
in git history — the last version before this rewrite is `git show 85ae65b:production.md`.

---

## What's running out there

| App | Folder | PM2 name | Internal port | Public URL |
|---|---|---|---|---|
| Storefront (Next.js) | `frontend/` | `yugenbd-frontend` | 3000 | `https://yugenbd.com` (+ `www`) |
| Admin dashboard (Next.js) | `admin/` | `yugenbd-admin` | 3001 | `https://hTdQ8yNsC3r.yugenbd.com` |
| REST API (Express) | `backend/` | `yugenbd-backend` | 4000 | `https://api.yugenbd.com` |

```
Internet ──443──> Nginx ──> :3000 frontend
                        ──> :3001 admin
                        ──> :4000 backend ──> Neon (Postgres) + Cloudinary
```

- Repo on the VPS: `~/yugenbd`, owned by the `deploy` user.
- Database is **Neon** (cloud) — nothing to restart or back up on the VPS.
- Secrets live in `backend/.env`, `frontend/.env.production`, `admin/.env.production`
  **on the server only**. They are git-ignored; only `*.env.example` is tracked.

---

## TL;DR

```bash
git push origin main
```

```bash
ssh deploy@YOUR_VPS_IP 'cd ~/yugenbd && bash deploy/deploy.sh'
```

That's the whole update. The rest of this file is what to check, what the script
does, and what to do when it goes wrong.

---

## Step 1 — On your machine: verify, commit, push

```bash
cd /home/faysal/Desktop/YugenBD
git status                       # nothing secret staged — only *.env.example is tracked
```

Typecheck before you ship (there is no test suite — this is your safety net):

```bash
cd backend && npm run typecheck && cd ../frontend && npx tsc --noEmit && cd ../admin && npx tsc --noEmit && cd ..
```

Then commit and push:

```bash
git add -A
git commit -m "describe your change"
git push origin main
```

**If you changed the DB schema**, generate the migration locally and commit it in the
same commit — never edit the production DB by hand:

```bash
cd backend && npm run db:generate
```

Commit both the new `backend/src/db/migrations/*.sql` **and** its
`meta/*_snapshot.json`. The deploy script applies it on the server.

---

## Step 2 — On the VPS: deploy

```bash
ssh deploy@YOUR_VPS_IP
```

```bash
cd ~/yugenbd && bash deploy/deploy.sh
```

`deploy/deploy.sh` runs, in order:

1. `git pull --ff-only`
2. `backend`: `npm ci` → `npm run db:migrate` → `npm run build`
3. `frontend`: `npm ci` → `npm run build`
4. `admin`: `npm ci` → `npm run build`
5. `pm2 reload ecosystem.config.js --update-env` → `pm2 save`

It is idempotent and `set -e` — safe to re-run after a failure. `pm2 reload` is a
graceful restart, so Nginx keeps serving through it.

> **`git pull --ff-only` fails if the server has local commits or dirty files.**
> Fix on the server with `git status`, then `git checkout -- <file>` / `git stash`.
> Never `git commit` on the VPS.

---

## Step 3 — Verify it's live

```bash
pm2 status                                                   # all three "online", low restart count
curl -s  https://api.yugenbd.com/health                      # {"success":true,...}
curl -sI https://yugenbd.com | head -1                       # HTTP/2 200
curl -sI https://hTdQ8yNsC3r.yugenbd.com | head -1           # HTTP/2 200
curl -s  "https://api.yugenbd.com/api/v1/products?limit=1"   # JSON with a product
curl -s  https://api.yugenbd.com/api/v1/delivery             # free-delivery settings
```

Then in a browser, exercise whatever you actually changed. A good default sweep:

- storefront home + a category + a product page render,
- add to cart → checkout shows the right delivery fee and total,
- admin login works and the Orders list loads.

Watch the logs for a minute after a deploy:

```bash
pm2 logs --lines 50
```

---

## Variants

**Only one app changed** (skips two builds — much faster on a small VPS):

```bash
cd ~/yugenbd && git pull --ff-only
cd frontend && npm ci && npm run build && cd ..
pm2 reload yugenbd-frontend
```

Swap `frontend`/`yugenbd-frontend` for `admin`/`yugenbd-admin`. For the backend the
middle line is `cd backend && npm ci && npm run db:migrate && npm run build && cd ..`,
then `pm2 reload yugenbd-backend --update-env`.

**Only a backend `.env` value changed** — no rebuild needed:

```bash
nano ~/yugenbd/backend/.env
pm2 reload yugenbd-backend --update-env
```

**A `NEXT_PUBLIC_*` value changed** — those are compiled into the JS at **build**
time, so a restart is not enough. Edit `frontend/.env.production` /
`admin/.env.production`, then rebuild that app (or just run `deploy/deploy.sh`).

**New env var added to the backend** — `config/env.ts` validates env with Zod and the
process **refuses to boot** if it's missing. Add it to `backend/.env` on the server
*before* reloading, or you'll take the API down.

**No git remote / rsync setup** — push files from your machine, then run the rest of
`deploy.sh` by hand:

```bash
rsync -avz --exclude node_modules --exclude '.next' --exclude '.env*' \
  /home/faysal/Desktop/YugenBD/ deploy@YOUR_VPS_IP:~/yugenbd/
```

---

## Rollback

```bash
cd ~/yugenbd
git log --oneline -5              # find the last good commit
git reset --hard <good_commit_sha>
bash deploy/deploy.sh
```

⚠️ **Rolling back code does NOT undo DB migrations.** If the bad deploy included a
migration, the old code will be running against a newer schema. Prefer **rolling
forward** — fix, commit, deploy again. If you must roll back across a migration,
restore the Neon branch/snapshot taken before the deploy.

---

## Never do this on production

- **`npm run seed`** — it repopulates demo data and **deletes/recreates the admin
  accounts** from the passwords in `backend/.env`. It is deliberately not in
  `deploy.sh`.
- **`npm run db:push`** — pushes schema straight from code, bypassing migrations, and
  desyncs the repo from the DB. Use `db:generate` + `db:migrate`.
- **Hand-editing tables in Neon** — the next `db:migrate` will fight you.
- **Committing a real `.env`** — only `*.env.example` is ever tracked.
- **Exposing 3000/3001/4000** — `ufw` keeps them internal; Nginx is the only door.

---

## Troubleshooting

```bash
pm2 status
pm2 logs yugenbd-backend --lines 100
pm2 monit
sudo tail -f /var/log/nginx/error.log
sudo nginx -t && sudo systemctl reload nginx
```

| Symptom | Cause / fix |
|---|---|
| **502 Bad Gateway** | Upstream app down. `pm2 status` → `pm2 logs <app>`. Usually a missing/invalid env var (backend refuses to boot on bad env) or a crashed build. |
| **CORS error in the browser console** | `CORS_ORIGIN` in `backend/.env` must list the exact origin (scheme + host, no trailing slash), comma-separated for storefront + admin. Then `pm2 reload yugenbd-backend --update-env`. |
| **Works via curl, fails in the browser only** | `NEXT_PUBLIC_API_URL` was wrong at **build** time. Fix `.env.production` and rebuild. |
| **Build killed / OOM** | Low RAM on KVM1. Ensure swap is on (`free -m`), or build one app at a time. |
| **`git pull --ff-only` rejected** | Local changes on the server — `git status`, then discard/stash them. |
| **Migration failed mid-deploy** | Nothing was reloaded yet (the script exits on error). Fix the migration, push, re-run `deploy.sh`. |
| **Neon "too many connections" / cold start** | Expected occasionally on serverless. Confirm `?sslmode=require` in `DATABASE_URL`. |
| **TLS expiring** | `sudo certbot renew --dry-run`; `systemctl list-timers \| grep certbot`. |

---

## File map

```
ecosystem.config.js                 PM2 manifest (3 apps)          — committed
deploy/deploy.sh                    one-command redeploy           — committed
deploy/nginx/rate-limits.conf       nginx rate-limit zones         — committed
deploy/nginx/yugenbd.com.conf       storefront server block        — committed
deploy/nginx/api.yugenbd.com.conf   API server block               — committed
deploy/nginx/admin.yugenbd.com.conf admin server block             — committed
backend/.env.production.example     template  → server: backend/.env
frontend/.env.production.example    template  → server: frontend/.env.production
admin/.env.production.example       template  → server: admin/.env.production
```

Real `.env*` files hold secrets and must never be committed.
