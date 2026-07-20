import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { users, addresses, districts, divisions } from "../../db/schema";
import type { ListUsersQuery } from "./user.validators";

export const userRepository = {
  /**
   * Admin customer list: search by name / phone / email, paginated, newest
   * first. The default shipping address is left-joined so the table can show
   * where the customer is (division · district) without a second round trip,
   * and the order count is a correlated subquery matching BOTH orders linked by
   * userId and guest orders placed with the same phone — the same rule
   * orderRepository.findByUser uses, so the list count matches the detail page.
   */
  async findMany(query: ListUsersQuery) {
    const conditions = [eq(users.role, "customer")];
    if (query.q) {
      const pattern = `%${query.q}%`;
      conditions.push(
        or(
          ilike(users.fullName, pattern),
          ilike(users.phone, pattern),
          ilike(users.email, pattern)
        )!
      );
    }
    const where = and(...conditions);
    const offset = (query.page - 1) * query.limit;

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          emailVerified: users.emailVerified,
          isActive: users.isActive,
          createdAt: users.createdAt,
          divisionName: divisions.name,
          districtName: districts.name,
          orderCount: sql<number>`(
            select count(*)::int from "orders" o
            where o."user_id" = ${users.id} or o."phone" = ${users.phone}
          )`.as("order_count"),
        })
        .from(users)
        .leftJoin(addresses, and(eq(addresses.userId, users.id), eq(addresses.isDefault, true)))
        .leftJoin(divisions, eq(addresses.divisionId, divisions.id))
        .leftJoin(districts, eq(addresses.districtId, districts.id))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(query.limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
    ]);

    return { rows, total: count };
  },

  /**
   * Permanently delete a CUSTOMER account. The role guard is part of the WHERE
   * clause so an admin row can never be removed through this endpoint. The
   * customer's addresses go with it (ON DELETE CASCADE); their orders survive
   * with `user_id` set to null, keeping the sales history intact.
   */
  deleteCustomerById(id: string) {
    return db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.role, "customer")))
      .returning({ id: users.id })
      .then((rows) => rows[0] ?? null);
  },

  /** A single customer's account row (admins are not exposed through this module). */
  findCustomerById(id: string) {
    return db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.role, "customer")),
      columns: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
      },
    });
  },
};
