import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";
import { catchAsync } from "../../utils/catchAsyc";
import * as controller from "./controller";

const router = Router();

router.use(catchAsync(authenticate));
router.use(requirePermission("platform.dashboard.view"));

router.get("/overview", catchAsync(controller.getSecurityOverviewHandler));
router.get("/activity", catchAsync(controller.getSecurityActivityHandler));
router.get("/activity/:id", catchAsync(controller.getSecurityActivityDetailHandler));

export default router;
