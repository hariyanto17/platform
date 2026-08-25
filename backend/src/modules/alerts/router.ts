import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";
import { catchAsync } from "../../utils/catchAsyc";
import * as controller from "./controller";

const router = Router();

router.use(catchAsync(authenticate));
router.use(requirePermission("platform.dashboard.view"));

router.get("/", catchAsync(controller.getAlertsHandler));
router.get("/summary", catchAsync(controller.getAlertSummaryHandler));
router.get("/:id", catchAsync(controller.getAlertDetailHandler));
router.patch("/:id/acknowledge", catchAsync(controller.acknowledgeAlertHandler));
router.patch("/:id/resolve", catchAsync(controller.resolveAlertHandler));

export default router;
