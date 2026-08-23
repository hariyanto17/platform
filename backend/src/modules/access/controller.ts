import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import * as accessService from "./service";
import { grantAccessSchema } from "./validation";

export const grantAccessHandler = async (req: Request, res: Response) => {
  const { error, value } = grantAccessSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const access = await accessService.grantAccess(req.user.id, value);
  return responseHandler.created(res, access, "Access granted successfully");
};

export const revokeAccessHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  await accessService.revokeAccess(req.user.id, id);
  return responseHandler.ok(res, null, "Access revoked successfully");
};
