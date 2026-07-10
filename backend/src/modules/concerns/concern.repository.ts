import { asc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { concerns, productImages, productConcerns } from "../../db/schema";
import type { CreateConcernInput, UpdateConcernInput } from "./concern.validators";

export const concernRepository = {
  findBySlug(slug: string) {
    return db.query.concerns.findFirst({ where: eq(concerns.slug, slug) });
  },

  findById(id: string) {
    return db.query.concerns.findFirst({ where: eq(concerns.id, id) });
  },

  /**
   * All concerns ordered by sortOrder (optionally title-filtered), each with
   * its linked published products' main image — the service picks the first
   * as the representative product for the homepage card.
   */
  findAllWithProducts(q?: string) {
    return db.query.concerns.findMany({
      where: q ? ilike(concerns.title, `%${q}%`) : undefined,
      orderBy: asc(concerns.sortOrder),
      with: {
        productConcerns: {
          with: {
            product: {
              columns: { id: true, title: true, slug: true, status: true },
              with: {
                images: {
                  orderBy: asc(productImages.sortOrder),
                  limit: 1,
                  where: (image, { eq }) => eq(image.isMain, true),
                },
              },
            },
          },
        },
      },
    });
  },

  async countProductLinks(concernId: string) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productConcerns)
      .where(eq(productConcerns.concernId, concernId));
    return count;
  },

  create(values: CreateConcernInput & { slug: string }) {
    return db
      .insert(concerns)
      .values({
        title: values.title,
        slug: values.slug,
        imageUrl: values.imageUrl,
        sortOrder: values.sortOrder ?? 0,
      })
      .returning()
      .then((rows) => rows[0]);
  },

  update(id: string, values: Partial<{ title: string; slug: string; imageUrl: string; sortOrder: number }>) {
    return db
      .update(concerns)
      .set(values)
      .where(eq(concerns.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  remove(id: string) {
    return db.delete(concerns).where(eq(concerns.id, id)).returning().then((rows) => rows[0]);
  },
};

export type { UpdateConcernInput };
