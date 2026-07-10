import { db } from "../client";
import { divisions, districts, upazilas } from "../schema";
import { divisionsData } from "./data/divisions";
import { districtsData } from "./data/districts";
import { upazilasData } from "./data/upazilas";

export async function seedLocations() {
  const existing = await db.select({ id: divisions.id }).from(divisions).limit(1);
  if (existing.length > 0) {
    console.log("Locations already seeded, skipping.");
    return;
  }

  for (const divisionName of divisionsData) {
    const [division] = await db.insert(divisions).values({ name: divisionName }).returning();

    const districtNames = districtsData[divisionName] ?? [];
    for (const districtName of districtNames) {
      const [district] = await db
        .insert(districts)
        .values({ divisionId: division.id, name: districtName })
        .returning();

      const upazilaNames = upazilasData[districtName] ?? [];
      if (upazilaNames.length > 0) {
        await db
          .insert(upazilas)
          .values(upazilaNames.map((name) => ({ districtId: district.id, name })));
      }
    }
  }

  console.log("Seeded divisions, districts, and upazilas.");
}
