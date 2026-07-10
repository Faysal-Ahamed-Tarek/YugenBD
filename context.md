# YugenBD — Project Context

> This file is a complete snapshot of the project for use as LLM context.
> Last updated: 2026-07-09.

## 1. What this project is

**YugenBD** is a full-stack e-commerce website for Bangladeshi customers selling beauty & personal care products (skincare, haircare, makeup, men's grooming, etc.).

Key business constraints:
- **Cash on Delivery (COD) only** — there is NO payment gateway (no Stripe, no SSLCommerz). Never add payment integration.
- Delivery: 2–4 business days across Bangladesh (all 64 districts).
- Ordering via the site cart or via WhatsApp (`wa.me` prefilled links, hotline +8801700000000).
- Bangladeshi phone format everywhere: `+8801XXXXXXXXX` (regex `/^\+8801[3-9]\d{8}$/`).
- Currency: BDT, displayed as `৳` with no decimals (e.g. `৳799`).

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript, React 19), Tailwind CSS v4 |
| Backend | Express.js 4 + TypeScript (separate REST API, port 4000) |
| Database | PostgreSQL on Neon (serverless, region ap-southeast-1) |
| ORM | Drizzle ORM (`drizzle-orm/neon-serverless` over WebSocket — requires `neonConfig.webSocketConstructor = ws` in Node) |
| Images/Video | Cloudinary only (no local file storage, no images in DB) |
| Auth | JWT access + refresh pattern (middleware exists; register/login endpoints NOT built yet) |
| Validation | Zod (backend request validation) |
| Fonts | Jost via `next/font/google` |

## 3. Monorepo layout

```
YugenBD/
├── backend/        # Express API (port 4000)
│   └── src/
│       ├── app.ts, server.ts
│       ├── config/         # env.ts (validated env), cloudinary.ts
│       ├── db/
│       │   ├── client.ts   # Neon Pool + drizzle + ws constructor
│       │   ├── migrate.ts  # migration runner (npm run db:migrate)
│       │   ├── examples.ts # example Drizzle queries (user+address, cascading dropdowns, order snapshot)
│       │   ├── migrations/ # 0000 (initial), 0001 (testimonial_videos), 0002 (products.short_description)
│       │   ├── schema/     # enums, locations, users, addresses, categories, products, reviews, testimonials, relations, index
│       │   └── seeders/    # locations, categories, products, short-descriptions, testimonials (+ data/ files)
│       ├── middleware/     # auth.ts (requireAuth, requireRole, optionalAuth), errorHandler.ts
│       ├── modules/        # categories, products, testimonials, uploads — each: routes/controller/service/repository/validators
│       └── utils/          # ApiError, apiResponse (sendSuccess), asyncHandler, pagination
└── frontend/       # Next.js app (port 3000)
    └── src/
        ├── app/            # layout.tsx, page.tsx (home), product/[slug]/page.tsx, robots.ts, globals.css
        ├── components/
        │   ├── layout/     # Header, MobileSidebar, SearchBar, CartButton, Footer, BackToTop, BottomNav
        │   ├── home/       # HeroSlider, TestimonialsSection, TestimonialsCarousel
        │   ├── product/    # ProductCard, ProductCarousel, ProductImage, AddToCartButton, ProductGallery, ProductActions, ProductAccordion
        │   └── ui/         # Carousel, SocialIcons, Breadcrumbs
        ├── lib/            # api.ts (server fetch helpers), cart.ts (localStorage cart)
        └── types/          # index.ts (all shared interfaces)
```

## 4. Database schema (PostgreSQL, all PKs are UUID `defaultRandom()`)

Enums: `user_role` (customer|admin), `product_status` (draft|published), `order_status` (pending|confirmed|shipped|delivered|cancelled — enum exists, orders table NOT built yet).

- **divisions** — id, name. Seeded: all 8 BD divisions.
- **districts** — id, divisionId FK(cascade), name. Seeded: all 64 districts. Index on divisionId.
- **upazilas** — id, districtId FK(cascade), name. Seeded: representative subset (~495 total exist; full dataset not yet loaded). Index on districtId.
- **users** — id, fullName, email (nullable, unique idx), passwordHash, phone (unique idx, BD format), phoneVerified bool, role enum, isActive bool, timestamps.
- **addresses** — id, userId FK(cascade), label, divisionId/districtId/upazilaId FKs (indexed), unionOrArea, postOffice, postalCode (4-char), streetAddress, landmark, isDefault, timestamps. District == Zila (not duplicated).
- **categories** — id, name, slug (unique idx), createdAt. Seeded 8: skincare, haircare, body-care, wellness-supplements, mens-grooming, baby-care, makeup, fragrance.
- **products** — id, title, slug (unique idx), basePrice numeric(10,2), discountPrice numeric nullable, stock int, shortDescription text, whoIsItBestFor text, ingredients text, usageInstructions text, **additionInformation** text (NOTE: intentional legacy name, NOT "additionalInformation" — UI label says "Additional Information" but the column/field is `additionInformation`), status enum (idx), timestamps. Seeded: 20 realistic products (19 published, 1 draft: matte-liquid-lipstick).
- **product_categories** — composite PK (productId, categoryId), both FK cascade. Many-to-many.
- **product_images** — id, productId FK(cascade, idx), imageUrl (Cloudinary), isMain bool (only one true per product — enforced at app layer), sortOrder. Seed URLs point to `res.cloudinary.com/yugenbd/...` which is a placeholder cloud that 404s — frontend falls back to a local placeholder image.
- **reviews** — id, productId FK(cascade), userId FK(set null, nullable = guest reviews), name, rating int (CHECK 1–5), verified bool, date, comment. + **review_images** (id, reviewId FK cascade, imageUrl). No API module yet.
- **testimonial_videos** — id, title, description, videoUrl, posterUrl, orderId int, isActive bool (indexes on isActive and orderId), timestamps. Seeded 6 records using Cloudinary demo-cloud videos with vertical crop transformations (`c_fill,ar_9:16,w_540,q_auto`), posters via `so_2,f_jpg`.

Money is stored as `numeric` and serialized as **strings** in API JSON (e.g. `"basePrice": "950.00"`).

## 5. Backend API (base: `http://localhost:4000/api/v1`)

Response envelope: `{ success: true, data, meta? }` via `sendSuccess`; errors `{ success: false, message, ... }` via error middleware (Zod errors → 400, ApiError subclasses → their status, unknown → 500). `GET /health` returns liveness.

**Categories** (`/categories`)
- `GET /` — all categories, name-sorted (public)
- `GET /slug/:slug`, `GET /:id` (public)
- `POST /`, `PATCH /:id`, `DELETE /:id` (admin JWT)

**Products** (`/products`)
- `GET /` — list, paginated. Query params: `page`, `limit` (max 100), `status` (admin only sees drafts), `categoryId`, `categorySlug`, `search` (title ilike), `minPrice`, `maxPrice`, `sort` (newest|price_asc|price_desc|title_asc). Non-admin ALWAYS forced to published only. Each item includes `mainImage` and flat `categories[]`. Pagination meta: `meta.pagination = { page, limit, total, totalPages }`.
- `GET /slug/:slug`, `GET /:id` — detail with full `images[]` (sorted by sortOrder) and flat `categories[]` (join rows normalized in service). Draft products 404 for non-admins.
- `POST /`, `PATCH /:id`, `DELETE /:id` (admin) — create accepts `categoryIds[]` and `images[]`; validates discountPrice < basePrice; slug auto-generated from title via slugify if omitted.
- `POST /:id/images`, `PATCH /:id/images/:imageId/main`, `DELETE /:id/images/:imageId` (admin) — image management; "main" switch is transactional at app layer.

**Testimonials** (`/testimonials`)
- `GET /` — public homepage list: ACTIVE only, ordered by orderId, lean fields (id, title, videoUrl, posterUrl, orderId)
- `GET /all` (admin) — everything, full fields
- `GET /:id` (public), `POST /`, `PATCH /:id`, `DELETE /:id` (admin)

**Uploads** (`/uploads`)
- `POST /` (admin) — multer + Cloudinary, field name `images`, up to 10 files; returns Cloudinary URLs. Used for both product and review images.

**Auth middleware** (`middleware/auth.ts`): `requireAuth` (verifies JWT access token from `Authorization: Bearer`), `requireRole("admin")`, `optionalAuth` (sets req.user if token valid; used on product GETs so admins can see drafts). Register/login/refresh endpoints are NOT implemented yet — admin routes are effectively unreachable without manually minting a token with `JWT_ACCESS_SECRET`.

**Backend env** (`backend/.env`, validated in `config/env.ts`):
`NODE_ENV, PORT=4000, DATABASE_URL (Neon), JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CORS_ORIGIN=http://localhost:3000`

**Backend scripts**: `npm run dev` (tsx watch), `build`, `start`, `typecheck`, `db:generate` (drizzle-kit), `db:migrate`, `db:studio`, `seed` (idempotent — every seeder skips if data exists; short-descriptions seeder backfills null rows only).

## 6. Frontend

**Theme system** — single source of truth in `src/app/globals.css`:
CSS variables in `:root` mapped to Tailwind v4 tokens via `@theme inline`. Tokens: `--primary: #e5456d` (+ `-dark #c72f56`, `-light #fdeef2`), `--foreground: #171717`, `--muted #6b6b6b`, `--surface #f7f7f8`, `--border #e7e7ea`, font Jost (`--font-jost` from next/font in layout.tsx). Components use `bg-primary`, `text-foreground`, `border-border`, etc. — never hardcoded colors. Also: `.no-scrollbar` utility, `body { overflow-x: clip }` guard, smooth scroll.

**Data fetching pattern** (`src/lib/api.ts`): server-side `fetch` with `next: { revalidate: 300 }` (5-min ISR) against `API_URL` env. Returns `null`/`[]` on failure so pages render with empty sections instead of crashing. Helpers: `getCategories()`, `getProducts(params)`, `getProductBySlug(slug)`, `getTestimonials()`, `formatPrice()` (→ `৳XXX`, no decimals).

**Server-first architecture**: Server Components by default; the only client components are: MobileSidebar, CartButton, BottomNav, BackToTop, HeroSlider, TestimonialsCarousel, Carousel (arrow shell — receives server-rendered children), ProductImage (onError fallback), AddToCartButton, ProductGallery, ProductActions, ProductAccordion.

**Cart** (`src/lib/cart.ts`): localStorage under key `yugenbd_cart`, items `{ productId, slug, title, price, imageUrl, quantity }`. Components sync via a `window` CustomEvent `"cart:updated"` — no state library. Header badge and BottomNav badge both listen.

**Pages**
- `/` (static + 5-min ISR) — order: HeroSlider → TestimonialsSection → New Arrivals → Skincare Essentials → Haircare Picks → Makeup Must-Haves. All fetches in parallel `Promise.all`. Full metadata + OpenGraph + Twitter, JSON-LD (Organization + ItemList of 8 products), sr-only `h1`, semantic header/nav/main/section/footer.
- `/product/[slug]` (dynamic, ISR-cached fetch) — breadcrumbs (Home/Products/Category/Title); two-column grid `lg:grid-cols-2`, BOTH columns `lg:sticky lg:top-20`; left ProductGallery (desktop: main image + thumbnail tabs; mobile: scroll-snap carousel with dots); right: h1 title → category chips → price + strikethrough + `SAVE ৳X (Y%)` badge → shortDescription → ProductActions (quantity stepper capped at stock, "Order Now" adds qty to cart then routes to /cart, green "Order on WhatsApp" wa.me link with prefilled product+qty) → two info boxes (2–4 day delivery, COD) → ProductAccordion (Who is it best for? / Ingredients / Usage Instructions / Additional Information; single-open; + icon rotates 45°; empty sections filtered). `generateMetadata` + Product JSON-LD per product.
- `robots.ts` — allows all, disallows /cart /account /dashboard, points to sitemap (sitemap not yet created).

**Key component behaviors**
- **Header** (server): sticky, `bg-background/95 backdrop-blur`. Desktop: logo, SearchBar (plain GET form → `/search?q=`), account + cart icons, category nav from API. Mobile: logo left; cart + hamburger right.
- **MobileSidebar** (client): FULL-SCREEN white panel (`fixed inset-0`), slides from right, order: search → categories → social icons. Closed by default (`aria-hidden` + `inert`). **Rendered via `createPortal(document.body)` — CRITICAL: the header's `backdrop-blur` creates a containing block that traps `fixed` descendants, so the panel must be portaled.** Categories come as server props; if empty, client-side refetch on first open via `NEXT_PUBLIC_API_URL` with skeleton loading + "unavailable" fallback.
- **HeroSlider** (client): image-only slides (no text/CTA overlays), inside centered `max-w-7xl` container with rounded corners. Native scroll-snap, autoplay 5s (pauses on hover/touch), dots, first slide `priority` (LCP). Slide images: `/public/manual-images/hero-{1..4}.jpg` (generated 16–18KB gradient JPEGs — replace with real banners).
- **TestimonialsCarousel** (client): coverflow-style, NO carousel library — each card's translateX/scale/opacity computed from signed shortest-path distance to active index, single CSS transition. 5 visible desktop (±2), 3 mobile (±1). Card width `min(58vw,240px)` mobile / 300px desktop; stage height via CSS calc from card width (9:16). Edge-to-edge on mobile (section has no side padding; header text does). Auto-swipes every 3s; timer resets on slide change; **pauses while a video plays and resumes on video `ended`** (videos don't loop). Only the CENTER card ever mounts a `<video>` (poster-first, muted default, mute/unmute toggle bottom-right, playsInline); side cards are next/image posters; clicking a side card centers it and starts playback. White circular arrows outside the stage. Touch-swipe threshold 40px.
- **BottomNav** (client): mobile-only (`md:hidden`) app-style bar, fixed bottom, hidden until `scrollY > 120` then slides up. Items: Home /, Shop /products, Cart /cart (live badge), Search /search, Account /account. Active route via `usePathname`. `safe-area-inset-bottom` padding; footer has `pb-16 md:pb-0` clearance.
- **ProductCard** (server): image (client fallback), discount badge `-X%`, title link, price + strikethrough, AddToCartButton. Cards link to `/product/[slug]`.
- **ProductCarousel** (server): titled section, optional "View all" link, caps at 8 items; uses client `Carousel` (ui/) whose children stay server-rendered; 2-up mobile w/ snap, 4-up desktop w/ arrows.
- **ProductImage** (client): next/image `fill` with `onError` fallback to `/manual-images/product-placeholder.jpg`; props: `sizes`, `priority`.

**Frontend env** (`frontend/.env.local`): `API_URL=http://localhost:4000/api/v1` (server-side), `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (browser fallback fetch in sidebar), `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (metadata/JSON-LD).

**next.config.ts**: `images.remotePatterns` allows `https://res.cloudinary.com/**`.

**TypeScript types** (`src/types/index.ts`): `Category`, `ProductImage`, `ProductCategoryRef`, `Product` (list shape: has `mainImage`, `categories`, `shortDescription`), `ProductDetail` (= Product minus mainImage, plus `images[]`), `Pagination`, `ApiResponse<T>`, `ProductListParams`, `TestimonialVideo`. Prices are strings.

## 7. How to run

```bash
# Backend (terminal 1)
cd backend && npm install
npm run db:migrate   # applies 3 migrations to Neon
npm run seed         # idempotent: locations, categories, 20 products, short descriptions, 6 testimonials
npm run dev          # http://localhost:4000

# Frontend (terminal 2)
cd frontend && npm install
npm run dev          # http://localhost:3000  (or: npm run build && npm start)
```

Quick sanity checks:
- `curl localhost:4000/api/v1/categories` → 8 categories
- `curl "localhost:4000/api/v1/products?categorySlug=haircare&limit=3"` → filtered products
- `curl localhost:4000/api/v1/products/slug/vitamin-c-brightening-serum` → detail with images + categories
- `curl localhost:4000/api/v1/testimonials` → 6 videos

## 8. Conventions to follow

- Backend modules follow strict layering: `*.routes.ts` (Router + middleware) → `*.controller.ts` (parse with Zod, call service, `sendSuccess`) → `*.service.ts` (business rules, throws `ApiError.notFound/badRequest/conflict`) → `*.repository.ts` (Drizzle queries only). New resources copy this pattern.
- All controllers are wrapped in `asyncHandler`; never try/catch in controllers.
- Seeders must be idempotent (skip-if-exists or backfill-nulls-only).
- Frontend: server components by default, client only for interactivity; pass server-fetched data down as props; carousels use native scroll-snap or transform math, never heavy libraries; every image is next/image with a fallback story; all colors/typography through theme tokens.
- File links between products use slugs, never IDs, in URLs.
- Keep `Order Now`/cart flows COD-only; WhatsApp is the alternate order channel.

## 9. Current state & known gaps (next work candidates)

**Built and verified**: home page (SEO, static+ISR), product details page, categories/products/testimonials/uploads APIs, full seed data, theme system, cart (localStorage only), mobile UX (full-screen sidebar, bottom nav, snap carousels).

**Not built yet** (linked UI already points to these routes):
- Auth endpoints (register/login/refresh/OTP) — middleware ready, `bcryptjs`/`jsonwebtoken` installed.
- `/cart` page, checkout flow + **orders & order_items tables** (spec: order stores a denormalized address snapshot; `order_status` enum already exists).
- `/category/[slug]` listing page, `/products` (shop all), `/search` page (SearchBar and BottomNav already navigate to `/search?q=`).
- `/account`, `/dashboard` (admin) — role-based middleware exists server-side.
- Reviews API module + UI (tables exist).
- Addresses API module (tables + BD reference data exist; cascading dropdown example queries in `backend/src/db/examples.ts`).
- Full upazila dataset (~495; representative subset seeded).
- sitemap.xml, real product/hero images on a real Cloudinary account.

**Gotchas**
- `additionInformation` (not `additionalInformation`) — keep the legacy field name.
- Neon driver needs `neonConfig.webSocketConstructor = ws` anywhere a new DB entry point is created.
- Any `fixed`-position overlay rendered inside the header must be portaled to body (backdrop-blur containing block).
- Product seed image URLs 404 by design; UI falls back to placeholder — don't "fix" by removing fallback.
- The one draft product (matte-liquid-lipstick) must stay hidden from public endpoints — useful for testing draft visibility.
