import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listAnnouncements,
  listAllAnnouncements,
  createAnnouncement,
  reorderAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "./announcement.controller";

const router = Router();
const admin = [requireAuth, requireRole("admin")] as const;

router.get("/", asyncHandler(listAnnouncements));
router.get("/all", ...admin, asyncHandler(listAllAnnouncements));

router.post("/", ...admin, asyncHandler(createAnnouncement));
// `/reorder` must be declared before `/:id` so it isn't swallowed as an id.
router.patch("/reorder", ...admin, asyncHandler(reorderAnnouncements));
router.patch("/:id", ...admin, asyncHandler(updateAnnouncement));
router.delete("/:id", ...admin, asyncHandler(deleteAnnouncement));

export default router;
