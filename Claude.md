## 1 Admin order list + detail page

- Admin `/orders` list: ensure the table columns are exactly Order (id, short/truncated), 
  Customer (name), Total, Status, Date — remove any extra columns from the row itself, move 
  PDF/view actions to only be reachable via the detail page (row click), not inline buttons.
- Clicking a row (not a separate action icon — the row itself is the link) navigates to 
  `/orders/[id]` — new detail page:
    - Customer details: fullName, phone, address, deliveryZone/fee/estimate.
    - Product info: itemized table (image, title, weight label if applicable, unit price, 
      qty, line total), subtotal, delivery fee, grand total.
    - Shipping/status info: current order_status with an editable dropdown (PATCH status 
      inline), createdAt, payment info (see Part 4 — paymentMethod, and for bKash: 
      transactionId, amount, paymentStatus with a "Mark Verified" action).
    - "Download PDF" button (existing endpoint).
  Backend: existing `GET /api/v1/orders/:id` should already return everything needed — 
  extend the select if any of the above fields are missing from the current response shape.

═══════════════════════════════════════════
2 — Admin product weights rework
═══════════════════════════════════════════
- Rename the section label from "Weights / Sizes (optional)" to "Weights (optional)" 
  (admin product form only).
- Extend `product_weights` table (migration): add `stock` (int, default 0) and `price` 
  (numeric(10,2)) columns alongside existing `value`/`unit`. Each weight row now fully 
  represents its own sellable variant: amount, unit, stock, price.
- Admin product form — each weight row becomes: amount (number), unit (dropdown), stock 
  (number), price (number). Add/remove rows as before.
- If the admin has added at least one weight row, DISABLE the product-level base `stock` 
  input (visually greyed out, not submitted/ignored) — stock is now tracked per-weight only. 
  If zero weight rows exist, the base stock field behaves as before (product-level stock).
- Backend: product service must reflect this duality — `effectiveStock` for a product with 
  weights = sum of (or max of, pick sum since it's total sellable units) its weights' stock; 
  price shown on cards for a weighted product = lowest weight price (or default-weight 
  price) with the existing basePrice/discountPrice fields simply unused/ignored when weights 
  exist. Document this clearly in code comments since it changes how "in stock" and "price" 
  are derived for weighted products across cart/checkout/storefront.
- Cart/order line items already snapshot `weightLabel` (from prior task) — order stock 
  decrement (Part 9) must decrement the specific `product_weights.stock` row, not the 
  product's base stock, when a weight was selected.

═══════════════════════════════════════════
3a — Product detail page: shortDescription rendering
═══════════════════════════════════════════
- Bug: shortDescription (rich text HTML from the Tiptap editor) is rendering with visible 
  `<p>` tags as literal text instead of being parsed as HTML. Find where shortDescription is 
  output on the product detail page and fix it to render via the same sanitize-then-
  `dangerouslySetInnerHTML` pattern already used for the ProductAccordion fields — it's 
  likely currently just interpolated as plain text/escaped. Apply the same DOMPurify/
  sanitize-html allowlist (p, b/strong, i/em, ul/ol/li, a, br) used elsewhere for 
  consistency, then strip the wrapping block-level margin so it still sits inline with the 
  surrounding price/title layout (e.g. target the `<p>` tag's default margin via a 
  scoped className, not global CSS).

═══════════════════════════════════════════
3b — Checkout: payment method, phone format, address, fees, copy
═══════════════════════════════════════════
NOTE: bKash "Send Money" here means manual reference entry only — the customer sends money 
themselves via the bKash app and types in the transaction ID + amount for the admin to 
cross-check manually in the dashboard. This is NOT a payment gateway integration (no bKash 
API/webhook), so it does not conflict with the "no payment gateway" rule — no automated 
charge or callback is involved.

- SCHEMA: add to `orders`: `paymentMethod` enum ('bkash'|'cod', default 'cod'), 
  `bkashTransactionId` text nullable, `bkashAmount` numeric nullable, `paymentStatus` enum 
  ('pending'|'verified', default 'pending' — cod orders can default to 'pending' too since 
  "verified" there just means payment collected on delivery, or simplify: paymentStatus is 
  only meaningful for bkash, leave null for cod). Migration + update the orders Zod schema.
- CHECKOUT UI: payment method selector (radio/card style, same visual pattern as the 
  delivery-zone cards) — "bKash Send Money" vs "Cash on Delivery".
    - bKash selected → reveal two required inputs: Transaction ID (text), Amount (number, 
      could pre-fill with the order total as a hint but keep it editable/required since the 
      customer types what they actually sent). Show your bKash merchant/personal number as 
      static instructional text above the fields (placeholder value, admin can hardcode it 
      in a config/env var — e.g. `NEXT_PUBLIC_BKASH_NUMBER`).
    - COD selected → no extra fields, same as current behavior.
  Order submission blocked until the selected method's required fields are valid.
- Backend `POST /api/v1/orders`: accept `paymentMethod`, and when 'bkash', require 
  `bkashTransactionId` + `bkashAmount` (Zod conditional/refine). Store as-is; verification 
  happens later in the admin order detail page (Part 1) via a "Mark Verified" action 
  (`PATCH /api/v1/orders/:id/payment-status`, admin-only).
- PHONE FIELD: change format/validation from `+8801XXXXXXXXX` to local `01XXXXXXXXX` — 
  exactly 11 digits starting with `01`, regex `/^01[3-9]\d{8}$/`. Update the checkout form 
  input (maxLength 11, numeric-only), its validation message, and the backend Zod schema 
  for order creation to match. (Scope this change to the checkout/order phone field 
  specifically — confirm whether the same change should apply to the addresses/user schema 
  elsewhere; if those are separate from order-time phone capture, leave them untouched 
  unless asked.)
- ADDRESS FIELD: update the textarea placeholder to: 
  `"District, Upazila, Road, House"` (or a full example like 
  `"e.g. Dhaka, Dhanmondi, Road 5, House 12"` — pick whichever reads more naturally, keep it 
  short).
- DELIVERY FEE: change "Inside Dhaka" fee from ৳60 to ৳70 everywhere it's defined — this 
  must be a single source of truth server-side (the fee-lookup used by both customer 
  checkout and admin manual order creation), update it there only, not duplicated in 
  multiple files. Outside Dhaka stays ৳120.
- COPY: rename the checkout section heading "Delivery Area" → "Select Delivery Option" 
  (checkout page only, and the equivalent label in the admin manual-order modal if it 
  reuses the same wording).

═══════════════════════════════════════════
3c — Stock decrement + pre-order support
═══════════════════════════════════════════
- On successful order creation (`POST /api/v1/orders` and the admin manual-order endpoint), 
  within the same DB transaction that inserts the order/order_items: decrement 
  `products.stock` (or the matched `product_weights.stock` row when a weight was selected) 
  by the ordered quantity for each line item.
- PRE-ORDER: if a product's (or selected weight's) available stock is 0 at the time of 
  order, do NOT block the order — instead:
    - Allow the order to proceed, mark that specific `order_items` row with a new bool 
      column `isPreOrder = true` (migration), and do not let stock go negative (clamp at 0, 
      don't decrement below it).
    - If stock is between 1 and requested qty (partial availability), current behavior 
      (from the earlier checkout task) already rejects over-stock orders — keep that as-is 
      for the >0-but-insufficient case; the NEW pre-order allowance applies specifically to 
      the stock===0 case, not partial shortfalls, unless you want pre-order to also cover 
      partial shortfalls — default to: only when current stock is exactly 0 does the item 
      become fully pre-order (full requested qty as pre-order, since there's nothing to 
      partially fulfill).
    - Storefront: when a product (or the selected weight) has 0 stock, change the 
      "Add to Cart"/"Order Now" button to stay enabled but show a "Pre-Order" label and a 
      small badge/note ("Currently out of stock — order now and we'll ship when restocked"), 
      instead of disabling the button as an out-of-stock state normally would.
    - Order confirmation page + PDF: flag pre-ordered line items clearly (e.g. a 
      "Pre-Order" tag next to that line) so the customer knows to expect a delay.
    - Admin order detail page: same pre-order tag shown per line item.

═══════════════════════════════════════════
4 — Review moderation
═══════════════════════════════════════════
- SCHEMA: add `status` enum ('pending'|'approved'|'rejected') to `reviews`, default 
  'pending'. Migration; backfill any existing seeded reviews to 'approved' so current data 
  keeps showing (one-off data migration, not a schema default change).
- Backend:
    - `GET /api/v1/reviews` (public, storefront) — filter to `status = 'approved'` only.
    - `GET /api/v1/admin/reviews` (admin-only, new) — list ALL reviews regardless of status, 
      filterable by `status` and `productId`, searchable by reviewer name/product title 
      (`q`), same 16+load-more pattern used elsewhere in admin.
    - `PATCH /api/v1/admin/reviews/:id/status` (admin-only) — set status to 
      approved/rejected.
    - `POST /api/v1/admin/reviews` (admin-only) — manually create a review for a specific 
      product (productId, name, rating, comment, optional single image via existing uploads 
      flow) — created with `status = 'approved'` directly (admin-authored, no moderation 
      needed) and `verified = true` (reasonable default for admin-added reviews — flag this 
      assumption, adjust if you want it configurable).
- Admin frontend `/reviews` (new dashboard section, add to nav): `<AdminTable>` of all 
  reviews (product title thumbnail, reviewer name, rating, status badge, date, snippet of 
  comment), search + status filter tabs (All/Pending/Approved/Rejected), 16+load-more. Row 
  actions: Approve / Reject (pending/rejected reviews get an Approve action; approved 
  reviews get a Reject/unpublish action — simple status toggle, no separate detail page 
  needed unless the comment is long, in which case truncate with a "view full" expand). 
  "Add Review" button opens the same `<Modal>` pattern used for categories/concerns, but 
  with a product picker (searchable select) added since admin-added reviews need to target 
  a specific product.

Do not add payment integration (bKash stays manual-reference-only, no API/webhook). Do not 
touch additionInformation field naming. Do not regress existing approved reviews' visibility 
on the storefront (verify the backfill migration). Confirm end-to-end: admin order row → 
detail page shows everything; a weighted product's per-weight stock/price CRUD works and 
disables base stock; shortDescription renders without visible tags; checkout completes with 
both bKash (transaction id/amount captured, shows pending in admin, admin can mark verified) 
and COD; phone/address/fee/copy changes all reflect correctly; an order against a 
zero-stock item still completes and is flagged Pre-Order everywhere; and a new frontend 
review stays hidden from the storefront until an admin approves it, while an admin-added 
review appears immediately.