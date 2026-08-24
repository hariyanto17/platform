import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { getSettingsHandler, updateSettingsHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("platform.settings.view"),
  catchAsync(getSettingsHandler)
);

router.patch(
  "/",
  authenticate,
  requirePermission("platform.settings.update"),
  catchAsync(updateSettingsHandler)
);

export default router;
