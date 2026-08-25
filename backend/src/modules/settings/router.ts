import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getSettingsHandler,
  getSettingDetailHandler,
  updateSettingHandler,
  legacyUpdateSettingsHandler,
  resetSettingHandler,
  previewSettingHandler
} from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

// Secure entire configuration sub-tree
router.use(catchAsync(authenticate));

router.get(
  "/",
  requirePermission("platform.settings.view"),
  catchAsync(getSettingsHandler)
);

router.patch(
  "/",
  requirePermission("platform.settings.update"),
  catchAsync(legacyUpdateSettingsHandler)
);

router.get(
  "/:key",
  requirePermission("platform.settings.view"),
  catchAsync(getSettingDetailHandler)
);

router.get(
  "/:key/preview",
  requirePermission("platform.settings.view"),
  catchAsync(previewSettingHandler)
);

router.patch(
  "/:key",
  requirePermission("platform.settings.update"),
  catchAsync(updateSettingHandler)
);

router.delete(
  "/:key",
  requirePermission("platform.settings.update"),
  catchAsync(resetSettingHandler)
);

export default router;
