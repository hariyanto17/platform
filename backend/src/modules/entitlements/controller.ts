import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import * as service from "./service";
import { grantFeatureSchema, revokeFeatureSchema } from "./validation";

// Helper to determine if user is a platform administrator
const isSuperAdminUser = (req: Request): boolean => {
  const platformAccess = req.user?.access?.find((a) => a.applicationCode === "PLATFORM");
  return (
    platformAccess?.role?.code === "PLATFORM_ADMINISTRATOR" ||
    (platformAccess?.permissions || []).includes("platform.entitlements.manage") ||
    (platformAccess?.permissions || []).includes("platform.organizations.manage")
  );
};

export const getEffectiveEntitlementsHandler = async (req: Request, res: Response) => {
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;
  const targetOrgId = isSuperadmin && req.query.organizationId
    ? req.query.organizationId.toString()
    : userOrgId;

  const result = await service.resolveEffectiveEntitlements(targetOrgId);
  return responseHandler.ok(res, result, "Effective entitlements resolved successfully");
};

export const getOrganizationEntitlementsHandler = async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  if (!isSuperadmin && organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to access entitlements for this organization");
  }

  const result = await service.resolveEffectiveEntitlements(organizationId);
  return responseHandler.ok(res, result, "Organization entitlements resolved successfully");
};

export const grantCustomEntitlementHandler = async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  if (!isSuperadmin && organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to grant entitlements for this organization");
  }

  const { error, value } = grantFeatureSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await service.grantCustomEntitlement(req.user!.id, organizationId, value);
  return responseHandler.created(res, result, "Custom entitlement granted successfully");
};

export const revokeEntitlementHandler = async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  if (!isSuperadmin && organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to revoke entitlements for this organization");
  }

  const { error, value } = revokeFeatureSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await service.revokeEntitlement(req.user!.id, organizationId, value);
  return responseHandler.ok(res, result, "Feature entitlement revoked successfully");
};

export const removeOverrideHandler = async (req: Request, res: Response) => {
  const { organizationId, featureKey } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  if (!isSuperadmin && organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to modify entitlements for this organization");
  }

  const result = await service.removeOverride(req.user!.id, organizationId, featureKey);
  return responseHandler.ok(res, result, "Entitlement override removed and inherited access restored");
};

export const listOrganizationGrantsHandler = async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  if (!isSuperadmin && organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to access grants for this organization");
  }

  const grants = await service.listOrganizationGrants(organizationId);
  return responseHandler.ok(res, grants, "Organization entitlement grants retrieved successfully");
};
