import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { testimonialVideos } from "../../db/schema";
import type { CreateTestimonialInput, UpdateTestimonialInput } from "./testimonial.validators";

export const testimonialRepository = {
  findActive() {
    return db
      .select({
        id: testimonialVideos.id,
        title: testimonialVideos.title,
        videoUrl: testimonialVideos.videoUrl,
        posterUrl: testimonialVideos.posterUrl,
        orderId: testimonialVideos.orderId,
      })
      .from(testimonialVideos)
      .where(eq(testimonialVideos.isActive, true))
      .orderBy(asc(testimonialVideos.orderId));
  },

  findAll() {
    return db.select().from(testimonialVideos).orderBy(asc(testimonialVideos.orderId));
  },

  findById(id: string) {
    return db.query.testimonialVideos.findFirst({ where: eq(testimonialVideos.id, id) });
  },

  create(values: CreateTestimonialInput) {
    return db.insert(testimonialVideos).values(values).returning().then((rows) => rows[0]);
  },

  update(id: string, values: UpdateTestimonialInput) {
    return db
      .update(testimonialVideos)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(testimonialVideos.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  remove(id: string) {
    return db
      .delete(testimonialVideos)
      .where(eq(testimonialVideos.id, id))
      .returning()
      .then((rows) => rows[0]);
  },
};
