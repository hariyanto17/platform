import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getDashboardOverviewHandler,
  getDashboardOperationsHandler,
  getDashboardActivityHandler,
  getDashboardTransactionsHandler,
  getDashboardAnalyticsHandler,
  getDashboardReportHandler,
  logReportExportHandler,
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

router.get(
  "/analytics",
  authenticate,
  requirePermission("platform.dashboard.view"),
  catchAsync(getDashboardAnalyticsHandler)
);

router.get(
  "/reports/summary",
  authenticate,
  requirePermission("platform.dashboard.view"),
  catchAsync(getDashboardReportHandler)
);

router.post(
  "/reports/export",
  authenticate,
  requirePermission("platform.dashboard.view"),
  catchAsync(logReportExportHandler)
);

import alertsRouter from "../alerts/router";
router.use("/alerts", alertsRouter);

export default router;
