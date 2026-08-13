# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**YugenBD** — a full-stack e-commerce site for authentic Japanese beauty & personal-care products sold in Bangladesh. Three separate apps in one repo (no workspace/monorepo tooling — each has its own `package.json` and `node_modules`; run `npm install` in each):

| App | Stack | Port | Prod subdomain |
|---|---|---|---|
| `backend/` | Express 4 + TypeScript REST API | 4000 | `api.yugenbd.com` |
| `frontend/` | Next.js 16 (App Router, React 19, Tailwind v4) storefront | 3000 | `yugenbd.com` |
| `admin/` | Next.js 16 admin dashboard | 3001 | obfuscated subdomain (not `admin.`) |

**`context.md` is the detailed architecture reference** — read it for component-level behavior. It is dated (written 2026-07-09, before auth/orders/concerns/subcategories/admin/email/addresses landed), so trust the code over `context.md` where they conflict.

## Commands

```bash
# Backend (from backend/)
npm run dev          # tsx watch, http://localhost:4000
npm run build        # tsc -> dist/
npm run typecheck    # tsc --noEmit  (backend has real type checking)
npm run db:generate  # drizzle-kit generate — create a migration from schema changes
npm run db:migrate   # custom runner (src/db/migrate.ts) — applies committed migrations to Neon
npm run db:push      # push schema directly (dev convenience; prefer generate+migrate)
npm run db:studio    # drizzle-kit studio
npm run seed         # idempotent seeders (see gotcha below)
npm run db:backfill-locations   # one-off: fill division/district/upazila for old rows

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

Modules: `auth`, `products`, `categories`, `concerns`, `reviews`, `orders`, `addresses`, `locations`, `announcements`, `hero-slides`, `faq`, `uploads` (Cloudinary), `dashboard` (admin metrics). All wired in `backend/src/app.ts` under `/api/v1`; admin-only variants live at `/api/v1/admin/*`. Order-list routes (`/mine`, `/manual`, `/`) must stay declared **before** `/:id` so they aren't shadowed.

Response envelope is `{ success, data, meta? }` via `sendSuccess`; errors go through `errorHandler` (Zod → 400, `ApiError` → its status, unknown → 500). **Money is stored as `numeric` and serialized as strings** in JSON (e.g. `"basePrice": "950.00"`). All env vars are validated by a Zod schema in `config/env.ts` — add new ones there or the process refuses to boot.

**Database**: PostgreSQL on Neon via Drizzle + `@neondatabase/serverless` over WebSocket. Any new DB entry point must set `neonConfig.webSocketConstructor = ws` (see `db/client.ts`). Schema lives in `db/schema/*.ts`; migrations in `db/migrations/` are **committed to the repo and must stay in sync with the DB** — generate them, commit the `.sql` + `meta/*_snapshot.json` together. Seeders are idempotent (skip-if-exists / backfill-nulls-only).

**Email** (`config/mailer.ts`, nodemailer over SMTP): account verification, password reset, and a new-order notification to `ORDER_NOTIFICATION_EMAIL` (default `yugenbd@gmail.com`) fired from `orderService.create` — deliberately not awaited, so SMTP can never slow or fail a checkout. When `SMTP_USER`/`SMTP_PASS` are absent the link is logged to the console instead of sent, so flows stay testable locally. Send failures are logged, never rethrown — a mail outage must not 500 a registration. `FRONTEND_URL` builds the link targets.

**PDF invoices**: `modules/orders/order.pdf.ts` streams a branded A4 order summary with pdfkit at `GET /orders/:id/pdf` (public, rate-limited). pdfkit's built-in fonts lack the `৳` glyph — it prints `Tk`. The logo is read from `backend/assets/logo.png` relative to `process.cwd()`, which is `backend/` in both dev and prod.

## Auth (dual audience)

Both frontend and admin use JWT **access token in memory + httpOnly refresh cookie** (`yugenbd_refresh`, path-scoped to `/api/v1/auth`, `credentials: true` on all fetches). Client `AuthProvider`s (`frontend/src/lib/auth.tsx`, `admin/src/lib/auth.tsx`) silently refresh on 401 and clear session when refresh fails.

- **Admins log in by email** (`POST /auth/login`).
- **Customers register with name + phone + email + password + a division/district/upazila/area** (`POST /auth/register`) — the location seeds their default shipping address. They log in with **phone _or_ email** via `POST /auth/customer-login`.
- **Email verification is a hard gate**: customers cannot log in until they click the emailed link (`/verify-email`, `/resend-verification`). Admins are exempt. Rows predating the feature were backfilled to verified (migration 0018).
- Password reset is by emailed link (`/forgot-password` → `/reset-password`). Changing a password bumps `users.tokenVersion`, invalidating outstanding refresh tokens.
- Middleware: `requireAuth`, `requireRole("admin")`, `optionalAuth` (attaches `req.user` if a token is present — used on product/order reads so admins see drafts and orders link to the signed-in customer, while guests still work).

## Domain rules (do not violate)

- **Payments: COD or manual bKash only — never a payment gateway.** "bKash" = a customer-typed Send Money transaction id + amount; an admin flips `paymentStatus` `pending → verified` after cross-checking. No Stripe/SSLCommerz.
- **Phone format is the LOCAL Bangladeshi form `01XXXXXXXXX`** — `/^01[3-9]\d{8}$/` — for registration, addresses and checkout. (`+880…` survives only in seeded admin rows and `wa.me`/`tel:` links; checkout strips the prefix when prefilling from an account.) Currency BDT shown as `৳799` (no decimals) via `formatPrice`.
- Delivery zones enum: `inside_dhaka` / `outside_dhaka` (drives `deliveryFee`).
- Addresses hang off a seeded **division → district → upazila** hierarchy (`locations` module, cascade-deleted downward, referenced by `addresses`). Never let a customer free-type these — always select from `/locations`.
- Orders snapshot title/price/imageUrl into `order_items` (product FK is `set null`) so history survives product deletion. Guest orders allowed. `isPreOrder` flags lines ordered against 0 stock. The customer-facing order id is the **first 8 chars of the UUID**.
- **Categories are one level deep**: self-referencing `parentId` (NULL = top-level), nesting capped at one level in the service, `ON DELETE RESTRICT`. Categories have no image field (removed).
- **Curated product ordering**: `products.categoryOrder` / `products.shopOrder` are optional ints (NULL = unordered). The category pages request `sort=category_order`, the shop page `sort=shop_order`; both mean "positioned products first, ascending, `NULLS LAST`, then newest-first". Everything else (home sections, admin list, search) keeps the plain `newest` default.
- CMS-ish resources managed from admin and rendered by the storefront: `concerns` ("Shop by Concern"), `hero-slides`, `announcements` (marquee under the hero — active rows by `sortOrder`), and `faq` (Help Centre; four **fixed** segments: products/orders/delivery/returns, enum-backed, titles hardcoded in a `SEGMENTS` const in both apps).
- Reviews are guest-submittable and moderated (`review_status`: pending/approved/rejected); public list shows approved only.

## Frontend conventions

- **Server Components by default**; client components only for interactivity. Server-fetch data in `lib/api.ts` (uses `API_URL`, ISR `revalidate = 300`; pass `0` for no-store where freshness matters, e.g. reviews) and pass down as props. `apiGet` swallows errors and returns `null` so an unreachable backend renders empty sections instead of crashing — keep that contract. Client-side calls (checkout POST, sidebar refetch) use `NEXT_PUBLIC_API_URL`.
- Cart is **localStorage only** (`lib/cart.ts`, key `yugenbd_cart`), synced across components via a `window` `"cart:updated"` CustomEvent — no state library.
- All colors/typography go through theme tokens in `src/app/globals.css` (`bg-primary`, `text-foreground`, …) — never hardcode hex. Current `--primary` is `#765341`.
- Every image is `next/image` with a placeholder fallback. Carousels use native scroll-snap or transform math, not heavy libraries.
- Any `fixed`/`position` overlay rendered under the header must be **portaled to `document.body`** — the header's `backdrop-blur` creates a containing block that traps fixed descendants.
- Link to products by **slug, never id**.
- Admin authors product long-form fields as HTML with a Tiptap editor; the storefront **must** run it through `lib/sanitize.ts` (`sanitizeHtml` / `hasContent`, isomorphic-dompurify, tight tag+URI allowlist) before `dangerouslySetInnerHTML`.
- `contact` and `returns` are hand-authored static Server Components; `faq` is backend-driven (`getFaqs`). There is **no contact-message API**: `components/content/ContactForm.tsx` composes the enquiry into a prefilled `wa.me` WhatsApp link and opens it. WhatsApp is the storefront's support channel (same channel used for orders) — keep new "contact us" flows pointed there rather than adding a messages endpoint.

## Deployment

Single VPS behind Nginx, all three apps under PM2 (`ecosystem.config.js`, internal ports 4000/3000/3001 never exposed). Nginx configs in `deploy/nginx/`, one-command deploy is `bash deploy/deploy.sh` (rebuilds all three). Secrets live in each app's own `.env` (backend: dotenv; Next apps: `.env.production`) — only `*.env.example` is tracked. See `productUpdate.md` / `production.md` / `deployment.md` for the runbook. **Rolling back code does not undo DB migrations** — prefer rolling forward.

## Gotchas

- The product field/column is **`additionInformation` / `addition_information`** (legacy misspelling) even though the UI label reads "Additional Information". Keep it.
- **Do not run `npm run seed` against production** — it repopulates demo data and resets the admin accounts. `config/env.ts` ships *default* admin emails/passwords; real deployments must override them in `.env`.
- Rate-limit skipping is dev-only (`NODE_ENV !== "production"`); production keeps full limits.
- Seed product image URLs point at a placeholder Cloudinary cloud that 404s by design; the UI falls back to a local placeholder — don't "fix" by removing the fallback.
- Some schema comments mention product "weights" — that feature was removed; there is no weights table.
- `CORS_ORIGIN` is a comma-separated allowlist covering both the storefront and admin origins; adding an origin means editing that env var, not the CORS callback.
