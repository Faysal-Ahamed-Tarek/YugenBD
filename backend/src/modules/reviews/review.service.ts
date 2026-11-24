import { ApiError } from "../../utils/ApiError";
import { reviewRepository } from "./review.repository";
import type {
  AdminCreateReviewInput,
  AdminListReviewsQuery,
  AdminUpdateReviewInput,
  CreateReviewInput,
  ListAllReviewsQuery,
} from "./review.validators";

/** How many reviews the home-page slider shows. */
const SLIDER_SIZE = 8;

type ReviewRow = Awaited<ReturnType<typeof reviewRepository.findByProductId>>[number];

/** Public storefront DTO (no moderation fields exposed). */
function toDto(review: ReviewRow | Omit<ReviewRow, "images">, images: { id: string; imageUrl: string }[]) {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    verified: review.verified,
    date: review.date,
    comment: review.comment,
    reviewerImageUrl: review.reviewerImageUrl,
    images: images.map((image) => ({ id: image.id, imageUrl: image.imageUrl })),
  };
}

type FeaturedReviewRow = Awaited<ReturnType<typeof reviewRepository.findFeatured>>[number];

/** Home slider DTO — public fields plus the product the review is about. */
function toFeaturedDto(review: FeaturedReviewRow) {
  return {
    ...toDto(review, review.images),
    product: review.product ? { title: review.product.title, slug: review.product.slug } : null,
  };
}

type AdminReviewRow = Awaited<ReturnType<typeof reviewRepository.adminFindMany>>["rows"][number];

/** Admin DTO — includes status + the product it belongs to. */
function toAdminDto(review: AdminReviewRow) {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    verified: review.verified,
    status: review.status,
    date: review.date,
    comment: review.comment,
    reviewerImageUrl: review.reviewerImageUrl,
    isFeatured: review.isFeatured,
    featuredOrder: review.featuredOrder,
    product: review.product
      ? { id: review.product.id, title: review.product.title, slug: review.product.slug }
      : null,
    images: review.images.map((image) => ({ id: image.id, imageUrl: image.imageUrl })),
  };
}

export const reviewService = {
  /** Approved reviews for a product, newest first, each with its images. */
  async listByProduct(productId: string) {
    const rows = await reviewRepository.findByProductId(productId);
    return rows.map((review) => toDto(review, review.images));
  },

  /**
   * Create a guest review for a published product. `imageUrl` is the already
   * uploaded Cloudinary URL (or undefined when no image was attached). The
   * review starts 'pending' and stays hidden until an admin approves it.
   */
  async create(input: CreateReviewInput, imageUrl?: string) {
    const product = await reviewRepository.findProduct(input.productId);
    if (!product || product.status !== "published") {
      throw ApiError.notFound("Product not found");
    }

    const review = await reviewRepository.create(input);
    const image = imageUrl ? await reviewRepository.addImage(review.id, imageUrl) : null;

    return toDto(review, image ? [image] : []);
  },

  /** Admin moderation list — all statuses, filterable/searchable, paginated. */
  async adminList(query: AdminListReviewsQuery) {
    const { rows, total } = await reviewRepository.adminFindMany(query);
    return {
      items: rows.map(toAdminDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasMore: query.page * query.limit < total,
      },
    };
  },

  async updateStatus(id: string, status: "approved" | "rejected") {
    const updated = await reviewRepository.updateStatus(id, status);
    if (!updated) throw ApiError.notFound("Review not found");
    return updated;
  },

  /** Permanently delete a review (and its images via cascade). Admin only. */
  async remove(id: string) {
    const deleted = await reviewRepository.deleteById(id);
    if (!deleted) throw ApiError.notFound("Review not found");
    return deleted;
  },

  /**
   * Home slider: featured approved reviews in admin order; if fewer than 8 are
   * featured, top up with the latest approved 4★+ reviews that have text.
   */
  async listFeatured() {
    const featured = await reviewRepository.findFeatured(SLIDER_SIZE);
    const filler =
      featured.length < SLIDER_SIZE
        ? await reviewRepository.findLatestPositive(
            SLIDER_SIZE - featured.length,
            featured.map((r) => r.id)
          )
        : [];
    return [...featured, ...filler].map(toFeaturedDto);
  },

  /** Public "all reviews" page — approved reviews, paginated. */
  async listAll(query: ListAllReviewsQuery) {
    const { rows, total } = await reviewRepository.findApprovedPage(query);
    return {
      items: rows.map(toFeaturedDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasMore: query.page * query.limit < total,
      },
    };
  },

  async assertProductExists(productId: string | null | undefined) {
    if (!productId) return;
    const product = await reviewRepository.findProduct(productId);
    if (!product) throw ApiError.notFound("Product not found");
  },

  /** Admin-authored review — created approved + verified, visible immediately. */
  async createByAdmin(input: AdminCreateReviewInput) {
    await this.assertProductExists(input.productId);
    const review = await reviewRepository.createByAdmin(input);
    return this.adminGet(review.id);
  },

  /** Edit an existing review's content (any review, guest or admin-authored). */
  async update(id: string, input: AdminUpdateReviewInput) {
    await this.assertProductExists(input.productId);
    const updated = await reviewRepository.updateContent(id, input);
    if (!updated) throw ApiError.notFound("Review not found");
    return this.adminGet(id);
  },

  async adminGet(id: string) {
    const review = await reviewRepository.findByIdWithRelations(id);
    if (!review) throw ApiError.notFound("Review not found");
    return toAdminDto(review);
  },
};
