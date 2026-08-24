import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as settingsService from "./service";
import { updateSettingsSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";

export const getSettingsHandler = async (req: Request, res: Response) => {
  const data = await settingsService.getSettings();
  return responseHandler.ok(res, data, "Settings retrieved successfully");
};

export const updateSettingsHandler = async (req: Request, res: Response) => {
  const { error, value } = updateSettingsSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  // Active admin user context
  const adminUserId = req.user!.id;
  const data = await settingsService.updateSettings(adminUserId, value);

  return responseHandler.ok(res, data, "Settings updated successfully");
};
