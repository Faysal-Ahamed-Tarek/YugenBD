export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  role: "customer" | "admin";
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FaqSegment = "products" | "orders" | "delivery" | "returns";

export interface FaqItem {
  id: string;
  segment: FaqSegment;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { pagination: Pagination };
  message?: string;
  errors?: Record<string, string[]>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  // null = top-level category; set = a subcategory. `children` is present on
  // top-level rows from the default (tree) GET /categories response.
  parentId: string | null;
  sortOrder: number;
  children?: Category[];
  createdAt: string;
}

export interface Concern {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
}

/** Admin-configurable free-delivery rules — GET/PUT /delivery. */
export interface DeliverySettings {
  freeDeliveryThreshold: number;
  alwaysFree: boolean;
}

/** The admin-set "next shipment arrival" date shown on pre-order product pages. */
export interface ShipmentDate {
  id: string;
  expectedDate: string;
  updatedAt: string;
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
  // Optional curated positions; null = unordered (falls back to newest-first).
  categoryOrder: number | null;
  shopOrder: number | null;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  mainImage?: ProductImage | null;
  images?: ProductImage[];
  categories: ProductCategoryRef[];
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "bkash" | "cod";
export type PaymentStatus = "pending" | "verified";

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
  note: string | null;
  deliveryZone: "inside_dhaka" | "outside_dhaka";
  deliveryFee: string;
  deliveryEstimate: string;
  subtotal: string;
  total: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  bkashTransactionId: string | null;
  bkashAmount: string | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  items: OrderItem[];
  /**
   * True when the order's phone number belongs to a registered account.
   * Only present on the admin list (GET /orders), not on the detail read.
   */
  hasAccount?: boolean;
}

/** Order counts per status + total — GET /orders/counts (admin). */
export interface OrderCounts {
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  total: number;
}

/** One row of the cascading division → district → upazila selector. */
export interface LocationOption {
  id: string;
  name: string;
}

/** A customer row in the admin directory — GET /admin/users. */
export interface CustomerListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  /** From the default shipping address; null when the customer has none. */
  divisionName: string | null;
  districtName: string | null;
  orderCount: number;
}

/** A customer's default shipping address, with resolved location names. */
export interface CustomerAddress {
  id: string;
  fullName: string | null;
  phone: string | null;
  /** The typed area / house / road line (`street_address` on the row). */
  addressLine1: string;
  divisionName: string;
  districtName: string;
  upazilaName: string;
}

/** GET /admin/users/:id — account + shipping details + purchase history. */
export interface CustomerDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  address: CustomerAddress | null;
  orders: Order[];
  stats: { orderCount: number; totalSpent: string };
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  name: string;
  rating: number;
  verified: boolean;
  status: ReviewStatus;
  date: string;
  comment: string | null;
  product: { id: string; title: string; slug: string } | null;
  images: { id: string; imageUrl: string }[];
}
