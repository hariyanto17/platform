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

export const launchApplicationHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  const result = await appsService.createLaunchCode(req.user.id, code.toUpperCase());
  return responseHandler.ok(res, result, "Application launch authorized");
};

export const exchangeLaunchCodeHandler = async (req: Request, res: Response) => {
  const { code, application } = req.body;
  if (!code || !application) {
    throw new AppError("BAD_REQUEST", "Code and application parameters are required");
  }
  const result = await appsService.exchangeLaunchCode(code, application.toUpperCase());
  return responseHandler.ok(res, result, "Launch code exchanged successfully");
};
