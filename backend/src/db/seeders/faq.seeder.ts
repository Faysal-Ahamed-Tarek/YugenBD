import { db } from "../client";
import { faqItems } from "../schema";
import { faqData } from "./data/faq";

/** Idempotent: seeds the initial Help Centre questions only when empty. */
export async function seedFaq() {
  const existing = await db.select({ id: faqItems.id }).from(faqItems).limit(1);
  if (existing.length > 0) {
    console.log("FAQ already seeded, skipping.");
    return;
  }

  // sortOrder is per-segment, following insertion order within each segment.
  const perSegment = new Map<string, number>();
  const rows = faqData.map((item) => {
    const next = perSegment.get(item.segment) ?? 0;
    perSegment.set(item.segment, next + 1);
    return { ...item, sortOrder: next };
  });

  await db.insert(faqItems).values(rows);
  console.log(`Seeded ${rows.length} FAQ items.`);
}
