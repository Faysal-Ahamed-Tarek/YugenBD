import { ApiError } from "../../utils/ApiError";
import { addressRepository } from "./address.repository";
import { locationRepository } from "../locations/location.repository";
import type { SaveAddressInput } from "./address.validators";

export const addressService = {
  /** The signed-in user's shipping details (null if not set yet). */
  getMine(userId: string) {
    return addressRepository.findDefaultByUser(userId);
  },

  /**
   * Validates the division → district → upazila chain is internally consistent.
   * Throws badRequest on mismatch. Exposed so callers (e.g. registration) can
   * check before creating dependent records.
   */
  async validateLocationChain(divisionId: string, districtId: string, upazilaId: string) {
    const district = await locationRepository.findDistrictById(districtId);
    if (!district || district.divisionId !== divisionId) {
      throw ApiError.badRequest("The selected district does not belong to the selected division.");
    }
    const upazila = await locationRepository.findUpazilaById(upazilaId);
    if (!upazila || upazila.districtId !== districtId) {
      throw ApiError.badRequest("The selected upazila does not belong to the selected district.");
    }
  },

  /**
   * Upsert the user's default shipping address. Validates the location chain:
   * the district must belong to the chosen division, and the upazila to the
   * chosen district — so the stored address is always internally consistent.
   */
  async saveMine(userId: string, input: SaveAddressInput) {
    await this.validateLocationChain(input.divisionId, input.districtId, input.upazilaId);

    const values = {
      fullName: input.fullName,
      divisionId: input.divisionId,
      districtId: input.districtId,
      upazilaId: input.upazilaId,
      phone: input.phone,
      streetAddress: input.addressLine1,
    };

    const existingId = await addressRepository.findDefaultId(userId);
    if (existingId) await addressRepository.updateById(existingId, values);
    else await addressRepository.insertDefault(userId, values);

    return addressRepository.findDefaultByUser(userId);
  },
};
