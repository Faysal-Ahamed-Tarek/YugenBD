# YugenBD — Production Deployment Guide (Hostinger KVM1 VPS + Namecheap DNS)

Step-by-step guide to deploy all three apps to a fresh Ubuntu VPS, then how to
ship code changes afterwards. Follow it top to bottom the first time.

---

## 0. What you're deploying

| App | Folder | Internal port | Public URL |
|---|---|---|---|
| Storefront (Next.js) | `frontend/` | 3000 | `https://yugenbd.com` (+ `www`) |
| Admin dashboard (Next.js) | `admin/` | 3001 | `https://hTdQ8yNsC3r.yugenbd.com` |
| REST API (Express) | `backend/` | 4000 | `https://api.yugenbd.com` |

- **Database** is Neon (serverless Postgres, already in the cloud) — you do **not** install Postgres on the VPS.
- **Images/video** are on Cloudinary (already in the cloud) — no local storage.
- **Nginx** is the public front door (ports 80/443) and reverse-proxies to the three internal ports. Ports 3000/3001/4000 stay firewalled off from the internet.
- **PM2** keeps the three Node processes alive and restarts them on reboot.

```
Internet ──443──> Nginx ──> :3000 frontend
                        ──> :3001 admin
                        ──> :4000 backend ──> Neon (Postgres) + Cloudinary
```

Config files already in this repo that you'll use:
- `ecosystem.config.js` — PM2 process manifest (repo root)
- `deploy/nginx/*.conf` — the three Nginx site configs + rate-limit zones
- `deploy/deploy.sh` — one-command redeploy script
- `backend/.env.production.example`, `frontend/.env.production.example`, `admin/.env.production.example`

---

## ⚠️ 1. Read this security note first

**Your chosen admin subdomain `hTdQ8yNsC3r` is a slice of the ADMIN2 password (`Wf4!hTdQ8yNsC3r`).**
When you issue the TLS certificate (Step 9), every hostname — including this one — is
published permanently to public **Certificate Transparency logs**. Anyone can list them.
A hostname derived from a password therefore leaks part of that password.

Strongly recommended before you go live:
1. Pick an unrelated random label: `openssl rand -hex 8` → e.g. `a3f9c1d7b2e04a6f`.
2. Use that as the admin subdomain everywhere in this guide instead of `hTdQ8yNsC3r`
   (DNS record, `deploy/nginx/admin.yugenbd.com.conf` `server_name`, `CORS_ORIGIN`, certbot `-d`).
3. **Rotate both admin passwords** (they appear in `.env.example` and in chat history) — see Step 12.

A hidden URL is only mild obfuscation; the real protection is the login + rate limits + firewall below.
The rest of this guide uses `hTdQ8yNsC3r.yugenbd.com` literally because that's what you asked for —
swap in your random label wherever you see it.

---

## 2. DNS setup (Namecheap)

In Namecheap → **Domain List → yugenbd.com → Manage → Advanced DNS**:

1. Delete any default **parking / URL-redirect** records Namecheap added (the "CNAME www → parkingpage", "URL Redirect @", etc.). Leave mail records (MX/TXT) alone if you use email.
2. Add these **A records** (Type = A Record, all pointing to your VPS IP; TTL = Automatic):

   | Host | Value |
   |---|---|
   | `@` | `YOUR_VPS_IP` |
   | `www` | `YOUR_VPS_IP` |
   | `api` | `YOUR_VPS_IP` |
   | `hTdQ8yNsC3r` | `YOUR_VPS_IP` |

3. Save. DNS can take 5–60 min to propagate. Check with:
   ```bash
   dig +short yugenbd.com
   dig +short api.yugenbd.com
   dig +short hTdQ8yNsC3r.yugenbd.com
   ```
   All must return your VPS IP before you run Certbot (Step 9).

> Your VPS IP is in the Hostinger hPanel → VPS → Overview.

---

## 3. First-time server setup

SSH in as root (Hostinger emails you the root password / lets you set an SSH key):
```bash
ssh root@YOUR_VPS_IP
```

**3.1 Update + create a non-root deploy user**
```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```
From now on log in as `deploy` (`ssh deploy@YOUR_VPS_IP`) and prefix admin commands with `sudo`.

**3.2 Install Node.js 20 LTS, PM2, Nginx, Certbot, git**
```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm install -g pm2
node -v      # should print v20.x
```

**3.3 (KVM1 low-RAM safety) add swap** — Next.js builds can run out of memory on a 1 GB plan. Skip if you have ≥4 GB.
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -m      # confirm swap shows up
```

---

## 4. Get the code onto the server

The redeploy script (`deploy/deploy.sh`) uses `git pull`, so a git remote is the smoothest path.
**This project is not a git repo yet** — set one up once on your machine:

**On your local machine:**
```bash
cd /home/faysal/Desktop/YugenBD
git init && git add -A && git commit -m "Initial production commit"
# create a PRIVATE repo (GitHub/GitLab), then:
git remote add origin git@github.com:YOURNAME/yugenbd.git
git push -u origin main
```
> Make sure `.env`, `.env.local`, `.env.production` are git-ignored (only the `*.example`
> files should be committed). Check with `git status` before pushing — no real secrets.

**On the VPS (as `deploy`):**
```bash
cd ~
git clone git@github.com:YOURNAME/yugenbd.git
cd yugenbd
```

<details>
<summary>No-git alternative (rsync from your machine)</summary>

```bash
# from your local machine — pushes files, skips node_modules/.env/.next
rsync -avz --exclude node_modules --exclude '.next' --exclude '.env*' \
  /home/faysal/Desktop/YugenBD/ deploy@YOUR_VPS_IP:~/yugenbd/
```
If you go this route, you'll rerun rsync (instead of `git pull`) for each redeploy, then run the rest of `deploy/deploy.sh` manually.
</details>

---

## 5. Create the environment files

Copy each example to its real file and fill in **real** values. These are NOT committed.

```bash
cd ~/yugenbd
cp backend/.env.production.example  backend/.env
cp frontend/.env.production.example frontend/.env.production
cp admin/.env.production.example    admin/.env.production
nano backend/.env        # fill Neon URL, JWT secrets, Cloudinary, CORS, admin seed pwds
nano frontend/.env.production   # set NEXT_PUBLIC_BKASH_NUMBER, confirm URLs
nano admin/.env.production      # confirm URLs
```

Key things to get right:
- **`backend/.env` → `DATABASE_URL`**: your Neon connection string (keep `?sslmode=require`).
- **`backend/.env` → `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`**: generate fresh:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- **`backend/.env` → `CORS_ORIGIN`** (exact, no trailing slash):
  ```
  CORS_ORIGIN=https://yugenbd.com,https://www.yugenbd.com,https://hTdQ8yNsC3r.yugenbd.com
  ```
- **`backend/.env` → `CLOUDINARY_*`**: from your Cloudinary dashboard.
- **`frontend/.env.production` → `NEXT_PUBLIC_BKASH_NUMBER`**: your real bKash number.
- The `NEXT_PUBLIC_*` and `API_URL` values already point at `https://api.yugenbd.com/api/v1` — leave them unless your domains differ.

> **Remember:** `NEXT_PUBLIC_*` values are compiled into the JS at **build time** (Step 6/11).
> Changing them later requires a rebuild, not just a restart.

---

## 6. Install, migrate, seed, build (first time)

```bash
cd ~/yugenbd

# Backend
cd backend
npm ci
npm run db:migrate     # applies all Drizzle migrations (incl. the latest 0008) to Neon
npm run seed           # FIRST TIME ONLY — locations, categories, products, admins, etc.
npm run build          # compiles TS -> dist/
cd ..

# Frontend
cd frontend && npm ci && npm run build && cd ..

# Admin
cd admin && npm ci && npm run build && cd ..
```

> `npm run seed` is idempotent (skips existing rows) but the **admin seeder deletes and
> recreates admin accounts from the passwords in `backend/.env`.** Run it once. Afterwards,
> for security, delete the four `ADMIN*` lines from `backend/.env` (they're not read at
> runtime) and change passwords from the dashboard (Step 12).

---

## 7. Start the apps with PM2

```bash
cd ~/yugenbd
pm2 start ecosystem.config.js
pm2 save                     # remember this process list
pm2 startup                  # prints a command — copy/paste & run it (enables boot startup)
pm2 status                   # all three should be "online"
```

Quick local check (before Nginx/SSL):
```bash
curl -s localhost:4000/health         # {"success":true,...}
curl -sI localhost:3000 | head -1      # HTTP/1.1 200
curl -sI localhost:3001 | head -1      # HTTP/1.1 200
```

---

## 8. Nginx reverse proxy

Install the rate-limit zones and the three site configs from this repo:

```bash
cd ~/yugenbd
# rate-limit zones live in the http{} context -> conf.d is auto-included there
sudo cp deploy/nginx/rate-limits.conf /etc/nginx/conf.d/yugenbd-rate-limits.conf

# site configs
sudo cp deploy/nginx/yugenbd.com.conf     /etc/nginx/sites-available/
sudo cp deploy/nginx/api.yugenbd.com.conf /etc/nginx/sites-available/
sudo cp deploy/nginx/admin.yugenbd.com.conf /etc/nginx/sites-available/

# enable them
sudo ln -s /etc/nginx/sites-available/yugenbd.com.conf     /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.yugenbd.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.yugenbd.com.conf /etc/nginx/sites-enabled/

# (optional) remove the default site so it doesn't shadow yugenbd.com
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t     # must say "syntax is ok / test is successful"
sudo systemctl reload nginx
```

> If you swapped the admin subdomain to a random label, edit `server_name` in
> `admin.yugenbd.com.conf` before copying.

---

## 9. HTTPS with Let's Encrypt (Certbot)

DNS (Step 2) must already resolve to the VPS. Then issue one cert covering all four hostnames:

```bash
sudo certbot --nginx \
  -d yugenbd.com -d www.yugenbd.com \
  -d api.yugenbd.com \
  -d hTdQ8yNsC3r.yugenbd.com
```
- Enter an email, agree to terms.
- When asked about HTTP→HTTPS redirect, choose **Redirect** (option 2).

Certbot edits the site configs in place (adds the `:443` blocks + redirect) and installs a
systemd renewal timer. Confirm auto-renew works:
```bash
sudo certbot renew --dry-run
systemctl list-timers | grep certbot     # shows the renewal timer
```

---

## 10. Firewall + hardening

```bash
sudo ufw allow OpenSSH        # keep SSH open (or your custom SSH port)
sudo ufw allow 'Nginx Full'   # 80 + 443
sudo ufw enable
sudo ufw status               # 3000/3001/4000 are NOT listed = not publicly reachable ✅
```

Recommended extras:
```bash
# fail2ban — bans IPs after repeated failed SSH logins
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```
- Consider SSH key-only auth (`PasswordAuthentication no` in `/etc/ssh/sshd_config`, then `sudo systemctl restart ssh`).
- If your admins have static IPs, uncomment the `allow`/`deny` block in `admin.yugenbd.com.conf` for an IP allowlist on the dashboard.

---

## 11. Smoke test (confirm everything is live)

```bash
curl -sI https://yugenbd.com | head -1                       # 200
curl -s  https://api.yugenbd.com/health                      # {"success":true,...}
curl -s  "https://api.yugenbd.com/api/v1/products?limit=1"   # JSON with a product
curl -sI https://hTdQ8yNsC3r.yugenbd.com | head -1           # 200 (admin login page)
```
Then in a browser:
- `https://yugenbd.com` — storefront loads, products show.
- `https://hTdQ8yNsC3r.yugenbd.com` — log in with an admin account, open Orders / Reviews.
- Place a test order end-to-end (COD + bKash), confirm it appears in the admin Orders list.

---

## 12. Rotate the admin passwords (do this once, right after first login)

Both admin passwords have been exposed (in `.env.example` and chat). Change them:

**Option A — from the dashboard (preferred):** log into the admin app → your account /
Change Password. (Backend route: `POST /api/v1/auth/change-password`.)

**Option B — re-seed with new passwords:** edit `ADMIN1_PASSWORD` / `ADMIN2_PASSWORD` in
`backend/.env`, run `cd backend && npm run seed`, then delete those lines from `.env` again.
(This recreates the admin rows; order history is preserved via `ON DELETE SET NULL`.)

Also rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` if they were ever shared (this logs
everyone out — fine). Restart backend after: `pm2 reload yugenbd-backend --update-env`.

---

## 13. 🚀 Deploying changes after the first deploy

You said you'll change code after launch. The flow:

**1. On your machine — commit & push:**
```bash
cd /home/faysal/Desktop/YugenBD
git add -A && git commit -m "describe your change"
git push
```

**2. On the VPS — run the deploy script:**
```bash
cd ~/yugenbd
bash deploy/deploy.sh
```
`deploy.sh` does, in order: `git pull` → `npm ci` (all 3) → `npm run db:migrate` (backend) →
`npm run build` (all 3) → `pm2 reload ecosystem.config.js` → `pm2 save`. It's idempotent —
safe to re-run if something fails midway.

**Things to know:**
- **Migrations run automatically.** If your change adds a Drizzle migration (`backend/src/db/migrations/…`), `deploy.sh` applies it. If you changed schema, generate the migration locally first (`cd backend && npm run db:generate`) and commit it — never edit the DB by hand.
- **`npm run seed` is NOT in the deploy script** (it would reset admin accounts). Only run it manually when you intentionally add new seed data.
- **Env changes:** if you edited any `NEXT_PUBLIC_*` value, you must rebuild — `deploy.sh`
  already rebuilds, so just re-run it. If you edited only backend `.env`, a
  `pm2 reload yugenbd-backend --update-env` is enough.
- **Faster single-app redeploy** (when you touched only one app), e.g. frontend:
  ```bash
  cd ~/yugenbd && git pull
  cd frontend && npm ci && npm run build && cd ..
  pm2 reload yugenbd-frontend
  ```
- **Zero-downtime:** `pm2 reload` restarts processes gracefully. Nginx keeps serving.

**Rollback** if a deploy breaks things:
```bash
cd ~/yugenbd
git log --oneline -5              # find the last good commit
git reset --hard <good_commit_sha>
bash deploy/deploy.sh
```

---

## 14. Operating / troubleshooting

```bash
pm2 status                        # process health
pm2 logs                          # all apps, live
pm2 logs yugenbd-backend --lines 100
pm2 monit                         # CPU/RAM per app
sudo tail -f /var/log/nginx/error.log
```

Common issues:
- **502 Bad Gateway** → the upstream app is down. `pm2 status`; `pm2 logs <app>` for the crash reason (often a missing/invalid env var — the backend refuses to start on bad env).
- **CORS errors in browser console** → `CORS_ORIGIN` in `backend/.env` doesn't exactly match the calling origin (scheme + host, no trailing slash). Fix and `pm2 reload yugenbd-backend --update-env`.
- **Checkout/reviews fail only in the browser** → `NEXT_PUBLIC_API_URL` was wrong at build time. Fix `frontend/.env.production` and rebuild (`deploy.sh`).
- **Certbot fails** → DNS not propagated yet, or port 80 blocked. Re-check `dig` + `ufw status`.
- **Build killed / OOM on the VPS** → add swap (Step 3.3).
- **Neon "too many connections" / cold starts** → expected occasionally on serverless; the app retries. Confirm `?sslmode=require` is in `DATABASE_URL`.

---

### File map (what lives where)
```
ecosystem.config.js                 PM2 manifest (3 apps)          — committed
deploy/deploy.sh                    redeploy script                — committed
deploy/nginx/rate-limits.conf       nginx rate-limit zones         — committed
deploy/nginx/yugenbd.com.conf       storefront server block        — committed
deploy/nginx/api.yugenbd.com.conf   API server block               — committed
deploy/nginx/admin.yugenbd.com.conf admin server block             — committed
backend/.env.production.example     template  → copy to backend/.env
frontend/.env.production.example    template  → copy to frontend/.env.production
admin/.env.production.example       template  → copy to admin/.env.production
```
Real `.env*` files hold secrets and must never be committed.
