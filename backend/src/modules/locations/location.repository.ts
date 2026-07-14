import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { divisions, districts, upazilas } from "../../db/schema";

export const locationRepository = {
  findDivisions() {
    return db
      .select({ id: divisions.id, name: divisions.name })
      .from(divisions)
      .orderBy(asc(divisions.name));
  },

  findDistrictsByDivision(divisionId: string) {
    return db
      .select({ id: districts.id, name: districts.name, divisionId: districts.divisionId })
      .from(districts)
      .where(eq(districts.divisionId, divisionId))
      .orderBy(asc(districts.name));
  },

  findUpazilasByDistrict(districtId: string) {
    return db
      .select({ id: upazilas.id, name: upazilas.name, districtId: upazilas.districtId })
      .from(upazilas)
      .where(eq(upazilas.districtId, districtId))
      .orderBy(asc(upazilas.name));
  },

  /** Used to validate the division → district → upazila chain is consistent. */
  findDistrictById(id: string) {
    return db.query.districts.findFirst({ where: eq(districts.id, id) });
  },

  findUpazilaById(id: string) {
    return db.query.upazilas.findFirst({ where: eq(upazilas.id, id) });
  },

  findDivisionById(id: string) {
    return db.query.divisions.findFirst({ where: eq(divisions.id, id) });
  },
};
