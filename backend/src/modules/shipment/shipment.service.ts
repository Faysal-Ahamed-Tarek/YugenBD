import { shipmentRepository } from "./shipment.repository";

export const shipmentService = {
  /** Public + admin read: the current shipment date, or null if unset. */
  getCurrent() {
    return shipmentRepository.getCurrent();
  },

  /** Admin write: set (or replace) the current shipment date. */
  setCurrent(expectedDate: string) {
    return shipmentRepository.upsert(expectedDate);
  },
};
