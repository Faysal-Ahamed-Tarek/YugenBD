import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { listDivisions, listDistricts, listUpazilas } from "./location.controller";

// Public reference data for the cascading address selector:
//   GET /locations/divisions
//   GET /locations/districts?divisionId=...
//   GET /locations/upazilas?districtId=...
const router = Router();

router.get("/divisions", asyncHandler(listDivisions));
router.get("/districts", asyncHandler(listDistricts));
router.get("/upazilas", asyncHandler(listUpazilas));

export default router;
