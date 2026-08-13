import type {
  ApiResponse,
  Category,
  Concern,
  ConcernDetail,
  CreateOrderPayload,
  Order,
  Product,
  ProductDetail,
  ProductListParams,
  ProductsPage,
  Review,
  HeroSlide,
  FaqItem,
  Announcement,
  ShipmentDate,
} from "@/types";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";
// Browser-visible base for client-side calls (checkout POST, etc.).
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Serialize list params into a query string, skipping undefined values. */
export function productQueryString(params: ProductListParams = {}): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) qs.set(key, String(value));
  });
  return qs.size > 0 ? `?${qs.toString()}` : "";
}

/**
 * Server-side fetch with ISR: pages revalidate every 5 minutes so the
 * home page is served as static HTML (fast + SEO) while staying fresh.
 */
async function apiGet<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    // revalidate <= 0 opts out of caching (always fresh) — used for reviews
    // so a newly submitted review appears immediately after router.refresh().
    const init: RequestInit & { next?: { revalidate: number } } =
      revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" };
    const res = await fetch(`${API_URL}${path}`, init);
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<T>;
    return json.success ? json.data : null;
  } catch {
    // Backend unreachable — render the page with empty sections rather than crash.
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  return (await apiGet<Category[]>("/categories")) ?? [];
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return (await apiGet<HeroSlide[]>("/hero-slides")) ?? [];
}

export async function getFaqs(): Promise<FaqItem[]> {
  return (await apiGet<FaqItem[]>("/faq")) ?? [];
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return (await apiGet<Announcement[]>("/announcements")) ?? [];
}

/** The admin-set next shipment date, or null if never configured — the
 *  ship-by date on pre-order product pages falls back to +15 days then. */
export async function getShipmentDate(): Promise<ShipmentDate | null> {
  return apiGet<ShipmentDate>("/shipment");
}

export async function getProducts(params: ProductListParams = {}): Promise<Product[]> {
  return (await apiGet<Product[]>(`/products${productQueryString(params)}`)) ?? [];
}

/** Products plus pagination meta — used by listing pages that need hasMore. */
export async function getProductsPage(params: ProductListParams = {}): Promise<ProductsPage> {
  const empty: ProductsPage = {
    products: [],
    pagination: {
      page: params.page ?? 1,
      limit: params.limit ?? 16,
      total: 0,
      totalPages: 0,
      hasMore: false,
    },
  };
  try {
    const res = await fetch(`${API_URL}/products${productQueryString(params)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as ApiResponse<Product[]>;
    if (!json.success || !json.meta) return empty;
    return { products: json.data, pagination: json.meta.pagination };
  } catch {
    return empty;
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return apiGet<ProductDetail>(`/products/slug/${encodeURIComponent(slug)}`);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return apiGet<Category>(`/categories/slug/${encodeURIComponent(slug)}`);
}

export async function getConcernBySlug(slug: string): Promise<ConcernDetail | null> {
  return apiGet<ConcernDetail>(`/concerns/${encodeURIComponent(slug)}`);
}

export async function getConcerns(): Promise<Concern[]> {
  return (await apiGet<Concern[]>("/concerns")) ?? [];
}

export async function getReviewsByProductId(productId: string): Promise<Review[]> {
  // no-store (revalidate 0): reviews must reflect newly submitted ones on refresh.
  return (await apiGet<Review[]>(`/reviews?productId=${encodeURIComponent(productId)}`, 0)) ?? [];
}

/** Fetch an order for the confirmation page (server-side, always fresh). */
export async function getOrderById(id: string): Promise<Order | null> {
  return apiGet<Order>(`/orders/${encodeURIComponent(id)}`, 0);
}

export interface CreateOrderResult {
  ok: boolean;
  order?: Order;
  error?: string;
}

/**
 * Place an order (client-side POST, no caching). Returns a friendly error
 * message on failure so the checkout page can show it without clearing the
 * cart.
 */
export async function createOrder(
  payload: CreateOrderPayload,
  accessToken?: string | null
): Promise<CreateOrderResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Attach the customer's token so the backend (optionalAuth) links the order
    // to their account; omitted for guests, who can still order.
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${PUBLIC_API_URL}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<Order> | null;
    if (res.status === 429) {
      return { ok: false, error: "Too many order attempts. Please wait a few minutes and try again." };
    }
    if (!res.ok || !json?.success) {
      return { ok: false, error: json?.message ?? "Could not place your order. Please try again." };
    }
    return { ok: true, order: json.data };
  } catch {
    return { ok: false, error: "Network error. Please check your connection and try again." };
  }
}

// Re-exported for existing server-side callers; client components should
// import from "@/lib/format" directly to avoid bundling server fetch code.
export { formatPrice } from "./format";
