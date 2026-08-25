import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as dashboardService from "./service";

export const getDashboardOverviewHandler = async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboardOverview();
  return responseHandler.ok(res, data, "Dashboard metrics retrieved successfully");
};

export const getDashboardOperationsHandler = async (req: Request, res: Response) => {
  const { date } = req.query;
  const data = await dashboardService.getDashboardOperations(date ? date.toString() : undefined);
  return responseHandler.ok(res, data, "Dashboard operations overview retrieved successfully");
};

export const getDashboardActivityHandler = async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboardActivity();
  return responseHandler.ok(res, data, "Dashboard activity retrieved successfully");
};

import { getTransactionsSchema, getAnalyticsSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";

export const getDashboardTransactionsHandler = async (req: Request, res: Response) => {
  const { error, value } = getTransactionsSchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const data = await dashboardService.getDashboardTransactions(value);
  return responseHandler.ok(res, data, "Dashboard transactions retrieved successfully");
};

export const getDashboardAnalyticsHandler = async (req: Request, res: Response) => {
  const { error, value } = getAnalyticsSchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const data = await dashboardService.getDashboardAnalytics(value);
  return responseHandler.ok(res, data, "Executive analytics retrieved successfully");
};

import { getReportSchema, exportReportSchema } from "./validation";
import { logActivity } from "../../utils/activityLogger";

export const getDashboardReportHandler = async (req: Request, res: Response) => {
  const { error, value } = getReportSchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  if (end < start) {
    throw new AppError("BAD_REQUEST", "endDate cannot be before startDate");
  }
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 366) {
    throw new AppError("BAD_REQUEST", "Date range cannot exceed 366 days");
  }

  const data = await dashboardService.getDashboardReport(value);

  // Log executive report generation audit
  const userId = (req as any).user?.id || "system";
  await logActivity(userId, "EXECUTIVE_REPORT_GENERATED", "ExecutiveReport", "summary", {
    startDate: value.startDate,
    endDate: value.endDate,
    compare: value.compare,
    organizationId: value.organizationId,
    applicationCode: value.applicationCode,
  });

  return responseHandler.ok(res, data, "Executive summary report retrieved successfully");
};

export const logReportExportHandler = async (req: Request, res: Response) => {
  const { error, value } = exportReportSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  if (end < start) {
    throw new AppError("BAD_REQUEST", "endDate cannot be before startDate");
  }
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 366) {
    throw new AppError("BAD_REQUEST", "Date range cannot exceed 366 days");
  }

  // Create audit event
  const userId = (req as any).user?.id || "system";
  await logActivity(userId, "EXECUTIVE_REPORT_EXPORTED", "ExecutiveReport", value.format, {
    reportType: "summary",
    startDate: value.startDate,
    endDate: value.endDate,
    format: value.format,
    organizationId: value.organizationId,
    applicationCode: value.applicationCode,
  });

  return responseHandler.ok(res, null, "Executive report export action logged successfully");
};

