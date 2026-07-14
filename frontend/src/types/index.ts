export interface Category {
  id: string;
  name: string;
  slug: string;
  // null = top-level; set = a subcategory. `children` holds the subcategories
  // on top-level rows from the default (tree) GET /categories response, and on
  // a single category fetched by slug when it is a parent. `parent` is present
  // on a single subcategory fetched by slug (used for breadcrumbs).
  parentId?: string | null;
  sortOrder?: number;
  children?: Category[];
  parent?: Category | null;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  isMain: boolean;
  sortOrder: number;
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  basePrice: string;
  discountPrice: string | null;
  stock: number;
  shortDescription: string | null;
  whoIsItBestFor: string | null;
  ingredients: string | null;
  usageInstructions: string | null;
  additionInformation: string | null;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  mainImage: ProductImage | null;
  categories: ProductCategoryRef[];
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

/** Detail endpoint shape: full image list instead of just the main image. */
export interface ProductDetail extends Omit<Product, "mainImage"> {
  images: ProductImage[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination: Pagination };
  message?: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  concernSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "title_asc" | "title_desc";
}

/** A page of products plus its pagination meta (from GET /products). */
export interface ProductsPage {
  products: Product[];
  pagination: Pagination;
}

export interface ReviewImage {
  id: string;
  imageUrl: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  verified: boolean;
  date: string;
  comment: string | null;
  images: ReviewImage[];
}

/** Shop-by-concern card: concern image/title linking to one representative product. */
export interface Concern {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  product: {
    title: string;
    slug: string;
    mainImage: ProductImage | null;
  } | null;
}

/** Concern header info from GET /concerns/:slug (products fetched separately). */
export interface ConcernDetail {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
}

export type DeliveryZone = "inside_dhaka" | "outside_dhaka";

export type PaymentMethod = "bkash" | "cod";
export type PaymentStatus = "pending" | "verified";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: "customer" | "admin";
}

export interface LocationOption {
  id: string;
  name: string;
}

export interface ShippingAddress {
  id: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  phone: string | null;
  addressLine1: string;
  divisionName: string;
  districtName: string;
  upazilaName: string;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  title: string;
  price: string;
  imageUrl: string | null;
  quantity: number;
  isPreOrder: boolean;
}

export interface Order {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  deliveryZone: DeliveryZone;
  deliveryFee: string;
  deliveryEstimate: string;
  subtotal: string;
  total: string;
  status: string;
  paymentMethod: PaymentMethod;
  bkashTransactionId: string | null;
  bkashAmount: string | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  items: OrderItem[];
}

/** POST /orders body — client sends only productId + quantity (never prices). */
export interface CreateOrderPayload {
  fullName: string;
  phone: string;
  address: string;
  deliveryZone: DeliveryZone;
  paymentMethod: PaymentMethod;
  bkashTransactionId?: string;
  bkashAmount?: number;
  items: Array<{ productId: string; quantity: number }>;
}

/** Lean shape served by GET /testimonials — only what the carousel renders. */
export interface TestimonialVideo {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl: string;
  orderId: number;
}
