import slugify from "slugify";
import { and, eq, ne } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "../db/client";

/**
 * Generates a URL-safe slug from `title` that is unique within `table`.
 * If the base slug already exists, appends `-2`, `-3`, … until free.
 * `idColumn`/`excludeId` let an update ignore the row being edited so it
 * doesn't collide with itself.
 *
 * Shared by products, categories, and concerns so slug uniqueness is
 * implemented once, consistently.
 */
export async function generateUniqueSlug(
  table: PgTable,
  slugColumn: PgColumn,
  title: string,
  options: { idColumn?: PgColumn; excludeId?: string } = {}
): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }) || "item";

  const exists = async (candidate: string): Promise<boolean> => {
    const whereSlug = eq(slugColumn, candidate);
    const where =
      options.idColumn && options.excludeId
        ? and(whereSlug, ne(options.idColumn, options.excludeId))
        : whereSlug;
    const rows = await db.select({ one: slugColumn }).from(table).where(where).limit(1);
    return rows.length > 0;
  };

  if (!(await exists(base))) return base;

  let counter = 2;
  // Cap the loop defensively; collisions past a few hundred are implausible.
  while (counter < 1000) {
    const candidate = `${base}-${counter}`;
    if (!(await exists(candidate))) return candidate;
    counter += 1;
  }
  // Extremely unlikely fallback.
  return `${base}-${Date.now()}`;
}
