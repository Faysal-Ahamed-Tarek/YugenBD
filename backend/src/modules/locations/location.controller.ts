import type { Request, Response } from "express";
import { z } from "zod";
import { sendSuccess } from "../../utils/apiResponse";
import { locationRepository } from "./location.repository";

const uuidParam = z.string().uuid();

export async function listDivisions(_req: Request, res: Response) {
  sendSuccess(res, await locationRepository.findDivisions());
}

export async function listDistricts(req: Request, res: Response) {
  const divisionId = uuidParam.parse(req.query.divisionId);
  sendSuccess(res, await locationRepository.findDistrictsByDivision(divisionId));
}

export async function listUpazilas(req: Request, res: Response) {
  const districtId = uuidParam.parse(req.query.districtId);
  sendSuccess(res, await locationRepository.findUpazilasByDistrict(districtId));
}
