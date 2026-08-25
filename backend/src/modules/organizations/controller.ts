import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as orgService from "./service";
import { createOrganizationSchema, updateOrganizationSchema, mapApplicationSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";

export const listOrganizationsHandler = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;

  const result = await orgService.listOrganizations(page, limit, search, status);
  return responseHandler.ok(res, result.items, "Organizations retrieved successfully", {
    total: result.pagination.total,
    page: result.pagination.page,
    limit: result.pagination.limit,
    totalPages: result.pagination.totalPages,
    pagination: result.pagination,
  });
};

export const getOrganizationByIdHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const org = await orgService.getOrganizationById(id);
  return responseHandler.ok(res, org, "Organization details retrieved successfully");
};

export const createOrganizationHandler = async (req: Request, res: Response) => {
  const { error, value } = createOrganizationSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.message);
  }

  const actorUserId = req.user!.id;
  const org = await orgService.createOrganization(value.name, value.code, value.status, actorUserId);
  return responseHandler.created(res, org, "Organization created successfully");
};

export const updateOrganizationHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateOrganizationSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.message);
  }

  const actorUserId = req.user!.id;
  const org = await orgService.updateOrganization(id, value.name, value.code, value.status, actorUserId);
  return responseHandler.ok(res, org, "Organization updated successfully");
};

export const mapApplicationHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = mapApplicationSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.message);
  }

  const actorUserId = req.user!.id;
  const mapping = await orgService.mapApplication(id, value.applicationCode, actorUserId);
  return responseHandler.created(res, mapping, "Application mapped to organization successfully");
};

export const unmapApplicationHandler = async (req: Request, res: Response) => {
  const { id, appCode } = req.params;
  const actorUserId = req.user!.id;
  await orgService.unmapApplication(id, appCode, actorUserId);
  return responseHandler.ok(res, null, "Application unmapped from organization successfully");
};
