import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import { QuotaService } from "./service";
import {
  checkQuotaSchema,
  recordUsageSchema,
  tenantQuotaOverrideSchema,
} from "./validation";

export const getEffectiveQuotasHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const targetOrgId = (req.query.organizationId as string) || user.organizationId;
  const period = req.query.period as string | undefined;

  // Tenant isolation check
  if (targetOrgId !== user.organizationId) {
    const hasPlatformView = user.access.some(
      (a) =>
        a.applicationCode === "PLATFORM" &&
        (a.permissions.includes("platform.quotas.view") ||
          a.permissions.includes("platform.organizations.view"))
    );
    if (!hasPlatformView) {
      throw new AppError("FORBIDDEN", "Cross-tenant access forbidden");
    }
  }

  const result = await QuotaService.resolveEffectiveQuotas(targetOrgId, period);
  return responseHandler.ok(res, result, "Effective quotas resolved successfully");
};

export const getEffectiveQuotaDetailHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const resourceCode = req.params.resourceCode;
  const targetOrgId = (req.query.organizationId as string) || user.organizationId;
  const period = req.query.period as string | undefined;

  if (targetOrgId !== user.organizationId) {
    const hasPlatformView = user.access.some(
      (a) =>
        a.applicationCode === "PLATFORM" &&
        (a.permissions.includes("platform.quotas.view") ||
          a.permissions.includes("platform.organizations.view"))
    );
    if (!hasPlatformView) {
      throw new AppError("FORBIDDEN", "Cross-tenant access forbidden");
    }
  }

  const result = await QuotaService.getEffectiveQuota(targetOrgId, resourceCode, period);
  return responseHandler.ok(res, result, "Resource quota detail resolved successfully");
};

export const getOrganizationQuotasHandler = async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId;
  const period = req.query.period as string | undefined;

  const result = await QuotaService.resolveEffectiveQuotas(organizationId, period);
  return responseHandler.ok(res, result, "Tenant effective quotas resolved successfully");
};

export const getUsageHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const targetOrgId = (req.query.organizationId as string) || user.organizationId;
  const resourceCode = req.query.resourceCode as string | undefined;
  const period = req.query.period as string | undefined;

  if (targetOrgId !== user.organizationId) {
    const hasPlatformView = user.access.some(
      (a) =>
        a.applicationCode === "PLATFORM" &&
        (a.permissions.includes("platform.quotas.usage.view") ||
          a.permissions.includes("platform.quotas.view"))
    );
    if (!hasPlatformView) {
      throw new AppError("FORBIDDEN", "Cross-tenant usage access forbidden");
    }
  }

  const result = await QuotaService.getUsageHistory(targetOrgId, resourceCode, period);
  return responseHandler.ok(res, result, "Usage history retrieved successfully");
};

export const recordUsageHandler = async (req: Request, res: Response) => {
  const { error, value } = recordUsageSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await QuotaService.recordUsage(req.user!.id, value);
  return responseHandler.created(res, result, "Resource usage recorded successfully");
};

export const checkQuotaHandler = async (req: Request, res: Response) => {
  const { error, value } = checkQuotaSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const targetOrgId = value.organizationId || req.user!.organizationId;

  if (targetOrgId !== req.user!.organizationId) {
    const hasPlatformView = req.user!.access.some(
      (a) =>
        a.applicationCode === "PLATFORM" &&
        (a.permissions.includes("platform.quotas.view") ||
          a.permissions.includes("platform.organizations.view"))
    );
    if (!hasPlatformView) {
      throw new AppError("FORBIDDEN", "Cross-tenant access forbidden");
    }
  }

  const result = await QuotaService.checkQuota(
    targetOrgId,
    value.resourceCode,
    value.requestedAmount,
    value.period
  );
  return responseHandler.ok(res, result, "Quota check evaluated successfully");
};

export const setTenantQuotaOverrideHandler = async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId;
  const { error, value } = tenantQuotaOverrideSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await QuotaService.setTenantQuotaOverride(
    req.user!.id,
    organizationId,
    value
  );
  return responseHandler.ok(res, result, "Tenant quota override configured successfully");
};

export const removeTenantQuotaOverrideHandler = async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId;
  const resourceCode = req.params.resourceCode;

  const result = await QuotaService.removeTenantQuotaOverride(
    req.user!.id,
    organizationId,
    resourceCode
  );
  return responseHandler.ok(res, result, "Tenant quota override removed successfully");
};
