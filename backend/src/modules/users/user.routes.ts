import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { listUsers, getUser, deleteUser } from "./user.controller";

// Admin-only customer directory, mounted at /api/v1/admin/users.
const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/", asyncHandler(listUsers));
router.get("/:id", asyncHandler(getUser));
router.delete("/:id", asyncHandler(deleteUser));

export default router;
