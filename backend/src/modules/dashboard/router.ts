import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getDashboardOverviewHandler,
  getDashboardOperationsHandler,
  getDashboardActivityHandler,
  getDashboardTransactionsHandler,
} from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get(
  "/overview",
  authenticate,
  requirePermission("platform.dashboard.view"),
  catchAsync(getDashboardOverviewHandler)
);

router.get(
  "/operations",
  authenticate,
  requirePermission("platform.dashboard.view"),
  catchAsync(getDashboardOperationsHandler)
);

router.get(
  "/activity",
  authenticate,
  requirePermission("platform.dashboard.view"),
  catchAsync(getDashboardActivityHandler)
);

router.get(
  "/transactions",
  authenticate,
  requirePermission("platform.dashboard.view"),
  catchAsync(getDashboardTransactionsHandler)
);

export default router;
