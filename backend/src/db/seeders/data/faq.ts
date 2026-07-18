import type { FaqSegment } from "../../../modules/faq/faq.validators";

export interface FaqSeed {
  segment: FaqSegment;
  question: string;
  answer: string; // blank lines separate paragraphs
}

/**
 * Initial Help Centre content — the questions that previously lived hard-coded
 * on the storefront FAQ page, now managed from admin. Answers are plain text;
 * a blank line starts a new paragraph.
 */
export const faqData: FaqSeed[] = [
  // ── Products & Authenticity ──────────────────────────────────────────────
  {
    segment: "products",
    question: "Are your products 100% authentic?",
    answer:
      "Yes. Every YugenBD product is genuine and imported directly from Japan. We source from authorised channels and never sell counterfeit, refilled, or expired stock. What arrives at your door is exactly what you would find on a shelf in Japan.",
  },
  {
    segment: "products",
    question: "How do I know a product will suit my skin?",
    answer:
      "Each product page lists its key ingredients, skin type, and how to use it. If you are unsure, message our Customer Care team with your skin concerns and we will happily recommend the right match from our range.\n\nWe always recommend a small patch test before first full use, especially for actives and new formulas.",
  },
  {
    segment: "products",
    question: "Are the products suitable for sensitive skin?",
    answer:
      "Many Japanese formulas are known for being gentle and fragrance-conscious, but sensitivity varies from person to person. Check the ingredient list on the product page and patch test first. If you have a known allergy, reach out before ordering and we will guide you.",
  },
  {
    segment: "products",
    question: "Do the products have long expiry dates?",
    answer:
      "Yes. We only stock items with a healthy shelf life. Because inventory is imported directly, batches move quickly and you receive fresh stock. Any product nearing its date is clearly marked or removed from sale.",
  },

  // ── Orders & Payment ─────────────────────────────────────────────────────
  {
    segment: "orders",
    question: "How do I place an order?",
    answer:
      "Browse the store, add your favourites to the cart, and check out with your delivery details. You can also order directly through our Instagram and Facebook pages — just send us a message.",
  },
  {
    segment: "orders",
    question: "What payment methods do you accept?",
    answer:
      "We accept bKash (Send Money) and Cash on Delivery.\n\nFor bKash orders, send the amount to our number and enter the transaction ID at checkout — an admin verifies it before dispatch.",
  },
  {
    segment: "orders",
    question: "Can I change or cancel my order after placing it?",
    answer:
      "Yes, as long as the order has not yet been packed or handed to the courier. Contact our Customer Care team as soon as possible with your order number and we will do our best to update or cancel it.",
  },
  {
    segment: "orders",
    question: "Do you restock sold-out items?",
    answer:
      "Most bestsellers are restocked regularly. If something you want is out of stock, you can still place it as a pre-order — we'll ship it as soon as it's back. You can also message us for the expected restock date.",
  },

  // ── Delivery ─────────────────────────────────────────────────────────────
  {
    segment: "delivery",
    question: "Do you deliver all over Bangladesh?",
    answer:
      "Yes. We deliver nationwide.\n\nInside Dhaka: typically 1–3 working days.\nOutside Dhaka: typically 3–5 working days via trusted courier.",
  },
  {
    segment: "delivery",
    question: "What are the delivery charges?",
    answer:
      "Delivery charges depend on your location and are shown at checkout. Inside-Dhaka delivery is charged at a flat city rate, while outside-Dhaka orders follow standard courier rates. We occasionally run free-delivery promotions on orders above a certain value.",
  },
  {
    segment: "delivery",
    question: "How is my order packaged?",
    answer:
      "Every order is packed with care in a protective YugenBD box to keep your products safe in transit. Glass and liquid items receive extra cushioning. Please keep the original packaging in case a return is ever needed.",
  },
  {
    segment: "delivery",
    question: "Can I track my order?",
    answer:
      "Yes. Once your parcel is dispatched, we share a tracking or consignment number through your preferred contact method so you can follow it to your door.",
  },

  // ── Returns & Care ───────────────────────────────────────────────────────
  {
    segment: "returns",
    question: "What is your return & refund policy?",
    answer:
      "If an item arrives damaged, defective, or incorrect, we will replace it or issue a full refund within 7–10 working days of an approved claim. Report the issue within 3 days of receipt with photo or video evidence.\n\nSee our full Return & Refund Policy for details.",
  },
  {
    segment: "returns",
    question: "Can I return a product if I change my mind?",
    answer:
      "Unfortunately no. For hygiene and safety reasons, we cannot accept used, opened, or swatched products, or returns based on a change of mind about smell, texture, colour, or design. Only damaged, defective, or incorrect items qualify for return.",
  },
  {
    segment: "returns",
    question: "What should I do if my order arrives damaged?",
    answer:
      "Record a clear unboxing photo or video, then contact our Customer Care team within 3 days with your order number and the evidence. Once verified, we arrange a replacement or refund — with no extra shipping fee for damaged or defective items.",
  },
  {
    segment: "returns",
    question: "How should I store my products?",
    answer:
      "Keep products in a cool, dry place away from direct sunlight and heat. Close caps and lids tightly after use, and follow any specific storage note on the packaging. Proper storage keeps your Japanese skincare fresh and effective for longer.",
  },
];
