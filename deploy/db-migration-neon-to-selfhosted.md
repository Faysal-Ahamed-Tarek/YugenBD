# Migrating the database: Neon → self-hosted PostgreSQL

The backend no longer uses the Neon serverless driver. It now connects to any
standard PostgreSQL server over TCP via `node-postgres` (`pg`), configured by
`DATABASE_URL` + `DATABASE_SSL` (see `backend/src/db/pool-config.ts`).

This runbook moves the **existing production data** from Neon onto a PostgreSQL
server installed on the **same VPS** as the apps (reached over `localhost`, no
TLS), **without deleting anything from Neon** — Neon stays live and untouched
until you have verified the cutover, so it is your rollback.

> Do the whole thing during a short maintenance window (or with the storefront
> in a read-only/quiet period) so no orders are written to Neon *after* you take
> the dump but *before* you flip `DATABASE_URL`.

---

## 0. Prerequisites

- Run everything on the **VPS itself** (it reaches Neon outbound and will host
  the new DB locally).
- **Match the PostgreSQL major version to Neon's — this database is on PG 18.6**,
  so install **PostgreSQL 18**. Restoring into an *older* major version can fail.
  (Re-check any time with `psql "$NEON_URL" -tAc "show server_version;"`.)
- Installing `postgresql-18` also gives you the matching `pg_dump`/`pg_restore`
  (>= 18), which the dump step needs. PG 18 may not be in Ubuntu's default
  archive yet — add the PGDG repo first:
  ```bash
  sudo apt-get install -y postgresql-common
  sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh   # adds the PGDG repo
  sudo apt-get install -y postgresql-18
  ```

Set these once in your shell (do **not** commit real credentials — copy
`NEON_URL` from `backend/.env`):
```bash
export NEON_URL='postgresql://neondb_owner:PASSWORD@ep-dawn-snow-ao4j4yiu.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
export NEW_URL='postgresql://yugenbd:CHANGE_ME_STRONG@localhost:5432/yugenbd'
```

---

## 1. Create the local role + database

PostgreSQL 18 is already installed (step 0) and running as a local service.
Create the app role and database:
```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE yugenbd WITH LOGIN PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE yugenbd OWNER yugenbd;
SQL
```

Because the DB lives on the same box and is reached over **loopback**, keep it
off the public internet — no TLS or firewall exposure required:

- `postgresql.conf`: `listen_addresses = 'localhost'` (the default — do **not**
  set it to `'*'`).
- `pg_hba.conf`: local + `127.0.0.1/32` / `::1/128` with `scram-sha-256`
  (the Ubuntu package defaults are already fine).
- Firewall: make sure port **5432 is NOT open** to the internet. The app
  connects via `localhost`, so nothing external ever needs it.
- `sudo systemctl restart postgresql` if you changed anything.

Sanity-check the local connection:
```bash
psql "$NEW_URL" -c '\conninfo'
```

---

## 2. Back up Neon (this file is your safety net — keep it)

Full dump (schema + data) in compressed custom format:
```bash
pg_dump "$NEON_URL" \
  --format=custom \
  --no-owner --no-privileges \
  --file=yugenbd-neon-$(date +%Y%m%d-%H%M%S).dump
```
`--no-owner --no-privileges` avoids errors from Neon-specific roles that don't
exist on your server. Store this `.dump` somewhere safe regardless of outcome.

---

## 3. Restore into the self-hosted server

The `yugenbd` database was created empty in step 1. Restore into it:
```bash
pg_restore \
  --no-owner --no-privileges \
  --dbname="$NEW_URL" \
  yugenbd-neon-YYYYMMDD-HHMMSS.dump
```

You can ignore a harmless warning about the `public` schema already existing.
If you prefer, `pg_restore --clean --if-exists ...` makes the restore repeatable
onto a non-empty DB.

> This full dump reproduces the exact schema Neon had, so you do **not** need to
> run `npm run db:migrate` for the initial load. Keep the committed Drizzle
> migrations for *future* schema changes.

---

## 4. Verify the copy before cutover

Compare row counts on both sides — they must match:
```bash
for t in users products categories product_categories product_concerns \
         product_images orders order_items addresses reviews review_images \
         concerns hero_slides announcements faq_items divisions districts \
         upazilas delivery_settings shipment_settings; do
  echo -n "$t  neon="
  psql "$NEON_URL" -tAc "select count(*) from \"$t\";" | tr -d '\n'
  echo -n "  new="
  psql "$NEW_URL"  -tAc "select count(*) from \"$t\";"
done
```
Also confirm the migration ledger came across (so future `db:migrate` is a no-op
against already-applied migrations):
```bash
psql "$NEW_URL" -c 'select * from drizzle.__drizzle_migrations order by id;'
```

---

## 5. Cut over the backend

In `backend/.env` on the VPS (from `.env.production.example`):
```env
DATABASE_URL=postgresql://yugenbd:CHANGE_ME_STRONG@localhost:5432/yugenbd
DATABASE_SSL=disable
```
Then restart just the backend:
```bash
cd /path/to/YugenBD/backend
npm run build            # picks up the new pg driver
pm2 restart yugenbd-backend
pm2 logs yugenbd-backend --lines 40   # confirm it booted, no DB errors
```

Smoke-test through the API:
```bash
curl -s localhost:4000/api/v1/categories | head
```
Then exercise the storefront + admin: log in, place a test order, verify it
lands in the new DB.

---

## 6. After you're confident

- Keep the Neon project around (paused/free) for a while as a fallback.
- Set up regular backups of the new server (e.g. a nightly `pg_dump` cron).
- Only delete the Neon project once you've run for a while on self-hosted and
  have working backups.

## Rollback

Nothing above writes to Neon, so rollback is just: set `DATABASE_URL` back to
the Neon string (and `DATABASE_SSL=require`, since Neon needs TLS) in
`backend/.env`, `pm2 restart yugenbd-backend`. Orders placed against the
self-hosted DB after cutover would
not be on Neon — that's why the window in step 2–5 should be short.
