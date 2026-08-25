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

import { getTransactionsSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";

export const getDashboardTransactionsHandler = async (req: Request, res: Response) => {
  const { error, value } = getTransactionsSchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const data = await dashboardService.getDashboardTransactions(value);
  return responseHandler.ok(res, data, "Dashboard transactions retrieved successfully");
};
