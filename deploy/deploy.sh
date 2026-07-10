#!/usr/bin/env bash
# Redeploy YugenBD after code changes. Idempotent — safe to re-run.
# Run from the repo root on the VPS:  bash deploy/deploy.sh
#
# It pulls latest code, installs deps, applies DB migrations, rebuilds all three
# apps (so build-time NEXT_PUBLIC_* env changes take effect), and reloads PM2
# with zero-downtime.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "▶ Deploying from $ROOT"

echo "▶ Pulling latest code…"
git pull --ff-only

echo "▶ Backend: install + migrate + build"
cd "$ROOT/backend"
npm ci
npm run db:migrate        # applies any new Drizzle migrations to Neon
npm run build

echo "▶ Frontend: install + build"
cd "$ROOT/frontend"
npm ci
npm run build

echo "▶ Admin: install + build"
cd "$ROOT/admin"
npm ci
npm run build

echo "▶ Reloading PM2…"
cd "$ROOT"
pm2 reload ecosystem.config.js --update-env
pm2 save

echo "✅ Deploy complete."
