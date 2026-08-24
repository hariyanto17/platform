import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as dashboardService from "./service";

export const getDashboardOverviewHandler = async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboardOverview();
  return responseHandler.ok(res, data, "Dashboard metrics retrieved successfully");
};
