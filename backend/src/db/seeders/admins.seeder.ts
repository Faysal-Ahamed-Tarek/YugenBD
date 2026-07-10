import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema";
import { env } from "../../config/env";

/**
 * Ensures exactly the two fixed admin accounts exist. Every existing
 * role='admin' user is removed first, then the two are (re)created with a
 * fresh bcrypt hash (cost 12). Passwords come from env vars (defaults in
 * config). Orders reference users via ON DELETE SET NULL, so replacing an
 * admin never destroys order history.
 */
export async function seedAdmins() {
  const admins = [
    {
      fullName: env.ADMIN1_NAME,
      email: env.ADMIN1_EMAIL,
      password: env.ADMIN1_PASSWORD,
      phone: "+8801700000001",
    },
    {
      fullName: env.ADMIN2_NAME,
      email: env.ADMIN2_EMAIL,
      password: env.ADMIN2_PASSWORD,
      phone: "+8801700000002",
    },
  ];

  await db.delete(users).where(eq(users.role, "admin"));

  for (const admin of admins) {
    const passwordHash = await bcrypt.hash(admin.password, 12);
    await db.insert(users).values({
      fullName: admin.fullName,
      email: admin.email,
      passwordHash,
      phone: admin.phone,
      phoneVerified: true,
      role: "admin",
      isActive: true,
    });
  }

  console.log(`Reset admin accounts (${admins.length} fixed admins).`);
}
