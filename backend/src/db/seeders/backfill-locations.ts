import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { divisions, districts, upazilas } from "../schema";
import { divisionsData } from "./data/divisions";
import { districtsData } from "./data/districts";
import { upazilasData } from "./data/upazilas";

/**
 * Idempotent, ADDITIVE location backfill. Ensures every division → district →
 * upazila/thana in the seed data exists in the DB, inserting only the missing
 * rows and never deleting or resetting anything. Safe to run on production
 * (unlike `npm run seed`, which repopulates demo data and resets admins).
 *
 * Use it to top up a database that was seeded before the full upazila + city
 * thana dataset landed:  `npm run db:backfill-locations`
 */
async function main() {
  const added = { divisions: 0, districts: 0, upazilas: 0 };

  for (const divisionName of divisionsData) {
    let [division] = await db
      .select({ id: divisions.id })
      .from(divisions)
      .where(eq(divisions.name, divisionName))
      .limit(1);
    if (!division) {
      [division] = await db.insert(divisions).values({ name: divisionName }).returning({ id: divisions.id });
      added.divisions++;
    }

    for (const districtName of districtsData[divisionName] ?? []) {
      let [district] = await db
        .select({ id: districts.id })
        .from(districts)
        .where(and(eq(districts.divisionId, division.id), eq(districts.name, districtName)))
        .limit(1);
      if (!district) {
        [district] = await db
          .insert(districts)
          .values({ divisionId: division.id, name: districtName })
          .returning({ id: districts.id });
        added.districts++;
      }

      const existing = await db
        .select({ name: upazilas.name })
        .from(upazilas)
        .where(eq(upazilas.districtId, district.id));
      const have = new Set(existing.map((r) => r.name));
      const missing = (upazilasData[districtName] ?? []).filter((name) => !have.has(name));
      if (missing.length > 0) {
        await db.insert(upazilas).values(missing.map((name) => ({ districtId: district.id, name })));
        added.upazilas += missing.length;
      }
    }
  }

  console.log(
    `Location backfill complete. Added ${added.divisions} divisions, ${added.districts} districts, ${added.upazilas} upazilas/thanas.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Location backfill failed:", err);
  process.exit(1);
});
