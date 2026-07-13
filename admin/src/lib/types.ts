export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  role: "customer" | "admin";
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
  weightLabel: string | null;
  quantity: number;
  isPreOrder: boolean;
}

export interface Order {
  id: string;
  fullName: string;
  phone: string;
  address: string;
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
