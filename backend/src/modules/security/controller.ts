import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import { getSecurityActivitySchema } from "./validation";
import * as securityService from "./service";

export const getSecurityOverviewHandler = async (req: Request, res: Response) => {
  const result = await securityService.getSecurityOverview();
  return responseHandler.ok(res, result, "Security overview retrieved successfully");
};

export const getSecurityActivityHandler = async (req: Request, res: Response) => {
  const { error, value } = getSecurityActivitySchema.validate(req.query);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await securityService.getSecurityActivity({
    page: value.page,
    limit: value.limit,
    search: value.search,
    eventType: value.eventType,
    severity: value.severity,
    category: value.category,
    userId: value.userId,
    applicationCode: value.applicationCode,
    organizationId: value.organizationId,
    startDate: value.startDate,
    endDate: value.endDate,
  });

  return responseHandler.ok(res, result.activities, "Security activities retrieved successfully", result.pagination);
};

export const getSecurityActivityDetailHandler = async (req: Request, res: Response) => {
  const detail = await securityService.getSecurityActivityDetail(req.params.id);
  if (!detail) {
    throw new AppError("NOT_FOUND", "Security audit record not found");
  }
  return responseHandler.ok(res, detail, "Security activity details retrieved successfully");
};
