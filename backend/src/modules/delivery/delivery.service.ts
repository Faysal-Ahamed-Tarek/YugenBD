import { deliveryRepository } from "./delivery.repository";
import type { UpdateDeliverySettingsInput } from "./delivery.validators";

/**
 * Fallback used until an admin saves settings for the first time — matches the
 * value that used to be hardcoded as FREE_DELIVERY_THRESHOLD in order.service.
 */
export const DEFAULT_FREE_DELIVERY_THRESHOLD = 3000;

export const deliveryService = {
  /** Raw row for the admin form + the storefront (null when never configured). */
  getCurrent() {
    return deliveryRepository.getCurrent();
  },

  /**
   * Effective config with defaults applied — the shape order pricing consumes.
   * Always returns concrete numbers so callers never branch on null.
   */
  async resolve(): Promise<{ freeDeliveryThreshold: number; alwaysFree: boolean }> {
    const row = await deliveryRepository.getCurrent();
    return {
      freeDeliveryThreshold: row ? Number(row.freeDeliveryThreshold) : DEFAULT_FREE_DELIVERY_THRESHOLD,
      alwaysFree: row?.alwaysFree ?? false,
    };
  },

  update(input: UpdateDeliverySettingsInput) {
    return deliveryRepository.upsert(input);
  },
};
