import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { listApplicationsHandler, getApplicationByCodeHandler, launchApplicationHandler, exchangeLaunchCodeHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.applications.view"), catchAsync(listApplicationsHandler));
router.get("/:code", authenticate, requirePermission("platform.applications.view"), catchAsync(getApplicationByCodeHandler));

// SSO Launch and Exchange
router.post("/:code/launch", authenticate, catchAsync(launchApplicationHandler));
router.post("/exchange", catchAsync(exchangeLaunchCodeHandler));

export default router;
