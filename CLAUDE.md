# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**YugenBD** — a full-stack e-commerce site for Bangladeshi beauty & personal-care products. Three separate apps in one repo (no workspace/monorepo tooling — each has its own `package.json` and `node_modules`; run `npm install` in each):

| App | Stack | Port | Prod subdomain |
|---|---|---|---|
| `backend/` | Express 4 + TypeScript REST API | 4000 | `api.yugenbd.com` |
| `frontend/` | Next.js (App Router, React 19, Tailwind v4) storefront | 3000 | `yugenbd.com` |
| `admin/` | Next.js admin dashboard | 3001 | obfuscated subdomain (not `admin.`) |

**`context.md` is the detailed architecture reference** — read it for component-level behavior. It is partially dated (2026-07-09, before auth/orders/concerns/subcategories/admin app landed), so trust the code over `context.md` where they conflict.

## Commands

```bash
# Backend (from backend/)
npm run dev          # tsx watch, http://localhost:4000
npm run build        # tsc -> dist/
npm run typecheck    # tsc --noEmit  (backend has real type checking)
npm run db:generate  # drizzle-kit generate — create a migration from schema changes
npm run db:migrate   # apply committed migrations to Neon
npm run db:push      # push schema directly (dev convenience; prefer generate+migrate)
npm run db:studio    # drizzle-kit studio
npm run seed         # idempotent seeders (see gotcha below)

# Frontend / admin (from frontend/ or admin/)
npm run dev          # frontend :3000, admin :3001
npm run build && npm start
npm run lint         # eslint — Next apps have NO typecheck script; use `npx tsc --noEmit`
```

There is no test suite. Verify changes by running the apps and hitting endpoints (e.g. `curl localhost:4000/api/v1/categories`).

## Backend architecture

Every resource under `backend/src/modules/<name>/` follows strict layering — copy this pattern for new resources:

```
*.routes.ts       Router + middleware (requireAuth/requireRole/optionalAuth, rate limiters)
*.controller.ts   parse input with Zod, call service, respond via sendSuccess — wrapped in asyncHandler, NEVER try/catch
*.service.ts      business rules; throws ApiError.notFound/badRequest/conflict/...
*.repository.ts   Drizzle queries only
*.validators.ts   Zod schemas
```

Routes are wired in `backend/src/app.ts`. Response envelope is `{ success, data, meta? }` via `sendSuccess`; errors go through `errorHandler` (Zod → 400, `ApiError` → its status, unknown → 500). **Money is stored as `numeric` and serialized as strings** in JSON (e.g. `"basePrice": "950.00"`).

**Database**: PostgreSQL on Neon via Drizzle + `@neondatabase/serverless` over WebSocket. Any new DB entry point must set `neonConfig.webSocketConstructor = ws` (see `db/client.ts`). Schema lives in `db/schema/*.ts`; migrations in `db/migrations/` are **committed to the repo and must stay in sync with the DB** — generate them, commit the `.sql` + `meta/*_snapshot.json` together. Seeders are idempotent (skip-if-exists / backfill-nulls-only).

## Auth (dual audience)

Both frontend and admin use JWT **access token in memory + httpOnly refresh cookie** (`yugenbd_refresh`, path-scoped to `/api/v1/auth`, `credentials: true` on all fetches). Client `AuthProvider`s (`frontend/src/lib/auth.tsx`, `admin/src/lib/auth.tsx`) silently refresh on 401 and clear session when refresh fails.

- **Admins log in by email** (`POST /auth/login`); **customers register/log in by phone** (`POST /auth/register`, `/auth/customer-login`).
- Middleware: `requireAuth`, `requireRole("admin")`, `optionalAuth` (attaches `req.user` if a token is present — used on product/order reads so admins see drafts and orders link to the signed-in customer, while guests still work).

## Domain rules (do not violate)

- **Payments: COD or manual bKash only — never a payment gateway.** "bKash" = a customer-typed Send Money transaction id + amount; an admin flips `paymentStatus` `pending → verified` after cross-checking. No Stripe/SSLCommerz.
- Bangladeshi phone everywhere: `/^\+8801[3-9]\d{8}$/`. Currency BDT shown as `৳799` (no decimals) via `formatPrice`.
- Delivery zones enum: `inside_dhaka` / `outside_dhaka` (drives `deliveryFee`).
- Orders snapshot title/price/imageUrl into `order_items` (product FK is `set null`) so history survives product deletion. Guest orders allowed. `isPreOrder` flags lines ordered against 0 stock.
- **Categories are one level deep**: self-referencing `parentId` (NULL = top-level), nesting capped at one level in the service, `ON DELETE RESTRICT`. Categories have no image field (removed). `concerns` ("Shop by Concern") and `hero-slides` are separate CMS-like resources managed from admin.
- Reviews are guest-submittable and moderated (`review_status`: pending/approved/rejected); public list shows approved only.

## Frontend conventions

- **Server Components by default**; client components only for interactivity. Server-fetch data in `lib/api.ts` (uses `API_URL`, ISR `revalidate`) and pass down as props. Client-side calls (checkout POST, sidebar refetch) use `NEXT_PUBLIC_API_URL`.
- Cart is **localStorage only** (`lib/cart.ts`, key `yugenbd_cart`), synced across components via a `window` `"cart:updated"` CustomEvent — no state library.
- All colors/typography go through theme tokens in `src/app/globals.css` (`bg-primary`, `text-foreground`, …) — never hardcode hex. Current `--primary` is `#765341`.
- Every image is `next/image` with a placeholder fallback. Carousels use native scroll-snap or transform math, not heavy libraries.
- Any `fixed`/`position` overlay rendered under the header must be **portaled to `document.body`** — the header's `backdrop-blur` creates a containing block that traps fixed descendants.
- Link to products by **slug, never id**.

## Deployment

Single VPS behind Nginx, all three apps under PM2 (`ecosystem.config.js`, internal ports 4000/3000/3001 never exposed). Nginx configs in `deploy/nginx/`, one-command deploy is `bash deploy/deploy.sh` (rebuilds all three). Secrets live in each app's own `.env` (backend: dotenv; Next apps: `.env.production`) — only `*.env.example` is tracked. See `productUpdate.md` / `production.md` for the deploy runbook. **Rolling back code does not undo DB migrations** — prefer rolling forward.

## Gotchas

- The product field/column is **`additionInformation` / `addition_information`** (legacy misspelling) even though the UI label reads "Additional Information". Keep it.
- **Do not run `npm run seed` against production** — it repopulates demo data and resets the admin accounts.
- Rate-limit skipping is dev-only (`NODE_ENV !== "production"`); production keeps full limits.
- Seed product image URLs point at a placeholder Cloudinary cloud that 404s by design; the UI falls back to a local placeholder — don't "fix" by removing the fallback.
