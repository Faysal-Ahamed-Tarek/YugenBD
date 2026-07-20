import { ApiError } from "../../utils/ApiError";
import { addressRepository } from "../addresses/address.repository";
import { orderRepository } from "../orders/order.repository";
import { userRepository } from "./user.repository";
import type { ListUsersQuery } from "./user.validators";

export const userService = {
  async list(query: ListUsersQuery) {
    const { rows, total } = await userRepository.findMany(query);
    return {
      items: rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasMore: query.page * query.limit < total,
      },
    };
  },

  /** Permanently delete a customer account. Admin accounts are not deletable here. */
  async remove(id: string) {
    const deleted = await userRepository.deleteCustomerById(id);
    if (!deleted) throw ApiError.notFound("Customer not found");
    return deleted;
  },

  /**
   * Everything the admin detail page shows: the account, its default shipping
   * address (division / district / upazila / area) and the full purchase
   * history — including guest orders placed with the same phone number.
   */
  async getById(id: string) {
    const user = await userRepository.findCustomerById(id);
    if (!user) throw ApiError.notFound("Customer not found");

    const [address, orders] = await Promise.all([
      addressRepository.findDefaultByUser(id),
      orderRepository.findByUser(id),
    ]);

    const totalSpent = orders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + Number(order.total), 0);

    return {
      ...user,
      address,
      orders,
      stats: { orderCount: orders.length, totalSpent: totalSpent.toFixed(2) },
    };
  },
};
