export interface ConcernSeed {
  title: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  /** Slugs of seeded products linked via product_concerns; the first one is
   *  the representative product shown on the homepage card. */
  productSlugs: string[];
}

// Placeholder Cloudinary URLs (same pattern as product_images seeds) — they
// 404 by design and the frontend falls back to the local placeholder image.
const img = (slug: string) =>
  `https://res.cloudinary.com/yugenbd/image/upload/v1/concerns/${slug}.jpg`;

export const concernsData: ConcernSeed[] = [
  {
    title: "Acne & Blemishes",
    slug: "acne-blemishes",
    imageUrl: img("acne-blemishes"),
    sortOrder: 1,
    productSlugs: [
      "niacinamide-10-face-serum",
      "charcoal-deep-cleansing-face-wash",
      "mens-charcoal-face-wash",
      "aloe-vera-soothing-gel",
    ],
  },
  {
    title: "Dark Spots & Pigmentation",
    slug: "dark-spots-pigmentation",
    imageUrl: img("dark-spots-pigmentation"),
    sortOrder: 2,
    productSlugs: [
      "vitamin-c-brightening-serum",
      "niacinamide-10-face-serum",
      "spf-50-sunscreen-gel",
    ],
  },
  {
    title: "Anti-Aging",
    slug: "anti-aging",
    imageUrl: img("anti-aging"),
    sortOrder: 3,
    productSlugs: [
      "retinol-night-repair-cream",
      "collagen-beauty-supplement",
      "vitamin-c-brightening-serum",
      "hyaluronic-acid-moisture-serum",
    ],
  },
  {
    title: "Dryness & Dehydration",
    slug: "dryness-dehydration",
    imageUrl: img("dryness-dehydration"),
    sortOrder: 4,
    productSlugs: [
      "hyaluronic-acid-moisture-serum",
      "shea-butter-body-lotion",
      "aloe-vera-soothing-gel",
      "rose-water-facial-toner",
    ],
  },
  {
    title: "Hair Fall",
    slug: "hair-fall",
    imageUrl: img("hair-fall"),
    sortOrder: 5,
    productSlugs: [
      "onion-black-seed-hair-oil",
      "argan-oil-hair-serum",
      "keratin-smoothing-conditioner",
      "multivitamin-gummies",
    ],
  },
  {
    title: "Dandruff & Scalp Care",
    slug: "dandruff-scalp-care",
    imageUrl: img("dandruff-scalp-care"),
    sortOrder: 6,
    productSlugs: [
      "anti-dandruff-shampoo",
      "onion-black-seed-hair-oil",
      "argan-oil-hair-serum",
    ],
  },
  {
    title: "Sensitive Skin",
    slug: "sensitive-skin",
    imageUrl: img("sensitive-skin"),
    sortOrder: 7,
    productSlugs: [
      "aloe-vera-soothing-gel",
      "rose-water-facial-toner",
      "baby-gentle-lotion",
      "shea-butter-body-lotion",
    ],
  },
  {
    title: "Sun Damage",
    slug: "sun-damage",
    imageUrl: img("sun-damage"),
    sortOrder: 8,
    productSlugs: [
      "spf-50-sunscreen-gel",
      "vitamin-c-brightening-serum",
      "aloe-vera-soothing-gel",
    ],
  },
];
