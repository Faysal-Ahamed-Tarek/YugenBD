import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";

export const authRepository = {
  findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },

  /** Case-insensitive email lookup — used for customer login by email. */
  findByEmailInsensitive(email: string) {
    return db.query.users.findFirst({
      where: sql`lower(${users.email}) = ${email.toLowerCase()}`,
    });
  },

  findByPhone(phone: string) {
    return db.query.users.findFirst({ where: eq(users.phone, phone) });
  },

  findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },

  createCustomer(values: {
    fullName: string;
    phone: string;
    email: string | null;
    passwordHash: string;
  }) {
    return db
      .insert(users)
      .values({ ...values, role: "customer" })
      .returning()
      .then((rows) => rows[0]);
  },

  updatePassword(id: string, passwordHash: string) {
    return db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
      .then((rows) => rows[0]);
  },
};
