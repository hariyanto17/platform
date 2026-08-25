import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  listApplicationsHandler,
  getApplicationByCodeHandler,
  launchApplicationHandler,
  exchangeLaunchCodeHandler,
  getPlatformUserContextHandler,
  updateApplicationStatusHandler
} from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.applications.view"), catchAsync(listApplicationsHandler));
router.get("/users/:platformUserId/context", catchAsync(getPlatformUserContextHandler));
router.get("/:code", authenticate, requirePermission("platform.applications.view"), catchAsync(getApplicationByCodeHandler));
router.patch("/:code/status", authenticate, requirePermission("platform.applications.manage"), catchAsync(updateApplicationStatusHandler));

// SSO Launch and Exchange
router.post("/:code/launch", authenticate, catchAsync(launchApplicationHandler));
router.post("/exchange", catchAsync(exchangeLaunchCodeHandler));

export default router;
