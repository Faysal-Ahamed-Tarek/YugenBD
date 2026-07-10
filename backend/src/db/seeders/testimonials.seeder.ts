import { db } from "../client";
import { testimonialVideos } from "../schema";
import { testimonialsData } from "./data/testimonials";

export async function seedTestimonials() {
  const existing = await db.select({ id: testimonialVideos.id }).from(testimonialVideos).limit(1);
  if (existing.length > 0) {
    console.log("Testimonials already seeded, skipping.");
    return;
  }

  const inserted = await db.insert(testimonialVideos).values(testimonialsData).returning();
  console.log(`Seeded ${inserted.length} testimonial videos.`);
}
