import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import { getAlertsSchema } from "./validation";
import * as alertsService from "./service";
import { AlertSeverity, AlertStatus } from "@prisma/client";

export const getAlertsHandler = async (req: Request, res: Response) => {
  const { error, value } = getAlertsSchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  // Trigger real-time backend condition monitoring sweep
  await alertsService.triggerAlertDetection();

  const result = await alertsService.getAlerts({
    page: value.page,
    limit: value.limit,
    severity: value.severity as AlertSeverity | undefined,
    category: value.category,
    status: value.status as AlertStatus | undefined,
    application: value.application,
    startDate: value.startDate,
    endDate: value.endDate,
    search: value.search,
  });

  return responseHandler.ok(res, result.alerts, "Alerts retrieved successfully", result.pagination);
};

export const getAlertSummaryHandler = async (req: Request, res: Response) => {
  // Trigger sweep
  await alertsService.triggerAlertDetection();

  const summary = await alertsService.getAlertSummary();
  return responseHandler.ok(res, summary, "Alert summary retrieved successfully");
};

export const getAlertDetailHandler = async (req: Request, res: Response) => {
  const alert = await alertsService.getAlertDetail(req.params.id);
  if (!alert) {
    throw new AppError("NOT_FOUND", "Executive alert not found");
  }
  return responseHandler.ok(res, alert, "Alert details retrieved successfully");
};

export const acknowledgeAlertHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "User context not identified");
  }

  const alert = await alertsService.acknowledgeAlert(req.params.id, req.user.id);
  if (!alert) {
    throw new AppError("NOT_FOUND", "Executive alert not found");
  }

  return responseHandler.ok(res, alert, "Alert acknowledged successfully");
};

export const resolveAlertHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "User context not identified");
  }

  const alert = await alertsService.resolveAlert(req.params.id, req.user.id);
  if (!alert) {
    throw new AppError("NOT_FOUND", "Executive alert not found");
  }

  return responseHandler.ok(res, alert, "Alert resolved successfully");
};
