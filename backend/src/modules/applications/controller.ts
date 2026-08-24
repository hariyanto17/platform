import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as appsService from "./service";
import { AppError } from "../../utils/errorHandler";

export const listApplicationsHandler = async (req: Request, res: Response) => {
  const apps = await appsService.listApplications();
  return responseHandler.ok(res, apps, "Applications retrieved successfully");
};

export const getApplicationByCodeHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const app = await appsService.getApplicationByCode(code.toUpperCase());
  if (!app) {
    throw new AppError("NOT_FOUND", "Aplikasi tidak ditemukan");
  }
  return responseHandler.ok(res, app, "Application details retrieved successfully");
};
