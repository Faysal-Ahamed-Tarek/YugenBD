Task: add a subcategory (child category) system — self-referencing categories, one level 
deep (category → subcategories, no further nesting needed unless you flag a reason to 
support more).

═══════════════════════════════════════════
1 — Schema
═══════════════════════════════════════════
- Add `parentId` (uuid, nullable, FK → categories.id, self-referencing, ON DELETE SET NULL 
  or restrict — prefer `restrict`: block deleting a parent category that still has children, 
  consistent with how product-in-use deletes are already blocked elsewhere) to the existing 
  `categories` table. Migration.
- A category with `parentId = null` is a top-level category; one with `parentId` set is a 
  subcategory. Enforce only ONE level of nesting at the service layer (reject creating a 
  subcategory whose chosen parent already has a parent itself) — keep this simple, don't 
  build arbitrary-depth tree logic unless asked.
- `product_categories` (existing many-to-many join) needs no schema change — a product can 
  link to a subcategory row the same way it links to a top-level category row today, since 
  subcategories are just categories with a parentId.

═══════════════════════════════════════════
2 — Backend API
═══════════════════════════════════════════
- Extend `GET /api/v1/categories` to return top-level categories with their children 
  nested, e.g. `{ id, name, slug, imageUrl, children: [{ id, name, slug }, ...] }` — this 
  single call should be enough to build both the header nav tree and admin listing without 
  N+1 fetches. Add an optional `?flat=true` if any existing caller needs the old flat shape 
  (check current callers before assuming this is safe to change unconditionally — if the 
  current shape is relied on elsewhere, keep the default flat and add `?tree=true` instead; 
  pick whichever requires fewer changes to existing call sites).
- Admin create/update category endpoints: accept optional `parentId` in the Zod schema, 
  validate it references an existing top-level category (parentId's own parentId must be 
  null) when provided, `ApiError.badRequest` otherwise.
- Admin delete category: if the category has children, `ApiError.conflict` ("delete or 
  reassign subcategories first") — don't cascade-delete children silently.
- Extend `GET /api/v1/products` category filtering: `categorySlug` should already filter by 
  a single category's linked products; confirm it also works when the slug given is a 
  subcategory's slug (should just work since subcategories are rows in the same table, 
  linked via the same product_categories join — verify, don't assume). Also confirm/add 
  that filtering by a PARENT category's slug returns products from the parent AND all its 
  children combined (this is likely NEW behavior — parent listing pages should show 
  everything under them, not just products directly tagged to the parent row) — implement 
  via a repository query that resolves child category IDs first, then filters 
  product_categories by (parentId + all childIds).

═══════════════════════════════════════════
3 — Admin dashboard: category management
═══════════════════════════════════════════
- Categories list page: show top-level categories with their subcategories nested/indented 
  underneath (expandable rows or a simple indented flat list — keep it simple, a 
  parent-row-followed-by-indented-child-rows list is fine, no need for a full tree widget).
- "Add New" category modal (existing pattern): add an optional "Parent Category" dropdown 
  (defaults to "None — top-level category"), populated from existing top-level categories 
  only (a subcategory cannot itself be chosen as a parent, per the one-level-deep rule).
  - If "Add New" is triggered from within an already-expanded parent row (e.g. an "+ Add 
    Subcategory" action next to a parent), pre-fill that parent in the dropdown.
- Edit modal: same parentId dropdown, allow moving a subcategory to a different parent, or 
  promoting/demoting (changing parentId to/from null) — but block demoting a category to 
  null if doing so would somehow break something (it won't, top-level has no constraint) 
  and block a category from becoming its own parent obviously.
- Product create/edit form: the category multi-select should now show the tree structure 
  too (parent categories with indented children beneath, both independently selectable — a 
  product can be tagged to a parent, a child, or both, admin's choice, no auto-inheritance 
  enforced).

═══════════════════════════════════════════
4 — Storefront: header navigation
═══════════════════════════════════════════
- Header category nav (desktop dropdown, and MobileSidebar's category list) should now 
  render the tree: top-level category as the main nav item, subcategories as a dropdown/
  flyout on hover (desktop) or an expandable sub-list (mobile sidebar, consistent with how 
  MobileSidebar already handles its sections). Top-level items with no children behave 
  exactly as they do today (no dropdown/arrow shown).
- Every nav item and dropdown entry (parent and child) links to `/category/[slug]`.

═══════════════════════════════════════════
5 — Storefront: /category/[slug] filtering
═══════════════════════════════════════════
- When the page's slug belongs to a TOP-LEVEL category that has children: show a filter 
  bar/chips above the product grid listing each subcategory name (plus an "All" option, 
  active by default) — clicking a subcategory chip updates the URL 
  (`?subcategory=slug` query param, client router push, same pattern as the price/concern 
  filters if that Shop page filtering task was completed) and refetches to show only that 
  subcategory's products; "All" shows the parent+all-children combined result (per #2's 
  repository change).
- When the page's slug belongs to a SUBCATEGORY directly (someone navigated straight to a 
  child), just show that subcategory's products normally — no filter bar needed (nothing to 
  filter by, it has no children of its own).
- Keep the existing 16-then-load-more pagination pattern; filter changes reset pagination to 
  page 1.
- Update breadcrumbs on this page: Home / Parent Category / Subcategory Name (when viewing 
  a subcategory directly) — matches user expectations and helps them navigate back up.

Do not add payment integration. Do not touch additionInformation field naming. Do not allow 
more than one level of nesting. Do not break existing category links/URLs that already 
point at top-level category slugs. Confirm end-to-end: admin can create a subcategory under 
a parent, assign a product to it, it appears correctly nested in the header nav (desktop 
dropdown + mobile sidebar), and visiting the parent's /category/[slug] page shows a working 
subcategory filter bar that correctly narrows the product grid.