/**
 * Short marketing descriptions keyed by product slug — the one-liner shown
 * under the price on the product details page. Kept as a separate map so
 * both the fresh-DB seeder and the backfill seeder share one source.
 */
export const shortDescriptionsBySlug: Record<string, string> = {
  "vitamin-c-brightening-serum":
    "A potent 20% Vitamin C serum that fades dark spots, evens skin tone, and restores a healthy glow — your morning brightness boost before sunscreen.",
  "hyaluronic-acid-moisture-serum":
    "Multi-weight Hyaluronic Acid pulls moisture deep into the skin for a plump, dewy finish that lasts all day — no greasy feel.",
  "niacinamide-10-face-serum":
    "A 10% Niacinamide treatment that tightens pores, controls oil, and smooths uneven texture for clearer-looking skin in weeks.",
  "aloe-vera-soothing-gel":
    "Pure aloe comfort for irritated, sun-stressed skin — cools on contact and absorbs fast without stickiness.",
  "charcoal-deep-cleansing-face-wash":
    "Activated charcoal lifts away dirt, oil, and pollution from deep in the pores while keeping the skin barrier happy.",
  "rose-water-facial-toner":
    "A refreshing mist of steam-distilled rose water that rebalances pH, tightens pores, and preps skin for serums.",
  "retinol-night-repair-cream":
    "A gentle-strength retinol night cream that smooths fine lines and renews skin texture while you sleep.",
  "spf-50-sunscreen-gel":
    "Featherlight SPF 50+ gel made for Bangladesh heat — no white cast, no grease, just serious daily sun protection.",
  "argan-oil-hair-serum":
    "Moroccan argan oil tames frizz, seals split ends, and adds instant mirror shine to dry, styled hair.",
  "onion-black-seed-hair-oil":
    "A weekly scalp treatment with onion and black seed oil to reduce hair fall and wake up dormant roots.",
  "anti-dandruff-shampoo":
    "Zinc pyrithione formula that clears visible flakes from the first wash and keeps the scalp calm between washes.",
  "keratin-smoothing-conditioner":
    "Keratin-infused conditioner that detangles, softens, and smooths chemically treated or heat-styled hair.",
  "coffee-body-scrub":
    "Ground robusta coffee buffs away rough, dull skin and boosts circulation for a smooth, energized glow.",
  "shea-butter-body-lotion":
    "Rich shea butter locks in 24-hour moisture — perfect for dry elbows, knees, and post-shower hydration.",
  "multivitamin-gummies":
    "Daily A-to-Zinc nutrition in a tasty chewable gummy — an easy habit for immunity and energy.",
  "collagen-beauty-supplement":
    "Marine collagen peptides with Vitamin C to support firmer skin, stronger nails, and healthier hair from within.",
  "beard-growth-oil":
    "A nutrient-dense blend of castor and argan oil that softens the beard, conditions the skin beneath, and supports fuller growth.",
  "mens-charcoal-face-wash":
    "A deep-cleansing charcoal wash built for oily skin, daily commutes, and Dhaka dust — cool menthol finish included.",
  "baby-gentle-lotion":
    "Fragrance-free, dermatologist-tested moisture for newborn-soft skin — gentle enough for daily use.",
  "matte-liquid-lipstick":
    "One-swipe, transfer-proof matte color that stays comfortable for 8+ hours without drying out your lips.",
};
