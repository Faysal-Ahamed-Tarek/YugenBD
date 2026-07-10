import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";

export const authRepository = {
  findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },

  findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
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
