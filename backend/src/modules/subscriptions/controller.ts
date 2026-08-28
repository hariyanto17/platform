import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import * as service from "./service";
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  addSubscriptionItemSchema,
  updateSubscriptionItemSchema,
  createPlanPriceSchema,
  createAddOnPriceSchema,
} from "./validation";

// Helper to determine if user is a platform administrator
const isSuperAdminUser = (req: Request): boolean => {
  const platformAccess = req.user?.access?.find((a) => a.applicationCode === "PLATFORM");
  return (
    platformAccess?.role?.code === "PLATFORM_ADMINISTRATOR" ||
    (platformAccess?.permissions || []).includes("platform.subscriptions.manage") ||
    (platformAccess?.permissions || []).includes("platform.organizations.manage")
  );
};

export const listSubscriptionsHandler = async (req: Request, res: Response) => {
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  const { organizationId, status, planCode } = req.query;
  const filter: any = {};

  if (!isSuperadmin) {
    filter.organizationId = userOrgId;
  } else if (organizationId) {
    filter.organizationId = organizationId.toString();
  }

  if (status) filter.status = status.toString();
  if (planCode) filter.planCode = planCode.toString();

  const subscriptions = await service.listSubscriptions(filter);
  return responseHandler.ok(res, subscriptions, "Subscriptions retrieved successfully");
};

export const getSubscriptionByIdHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  const subscription = await service.getSubscriptionById(id, userOrgId, isSuperadmin);
  return responseHandler.ok(res, subscription, "Subscription retrieved successfully");
};

export const createSubscriptionHandler = async (req: Request, res: Response) => {
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  const { error, value } = createSubscriptionSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  // Non-superadmin can only create subscription for their own organization
  if (!isSuperadmin && value.organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You can only manage subscriptions for your own organization");
  }

  const subscription = await service.createSubscription(req.user!.id, value);
  return responseHandler.created(res, subscription, "Subscription created successfully");
};

export const updateSubscriptionHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  const { error, value } = updateSubscriptionSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const subscription = await service.updateSubscription(req.user!.id, id, value, userOrgId, isSuperadmin);
  return responseHandler.ok(res, subscription, "Subscription updated successfully");
};

export const addSubscriptionItemHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  const { error, value } = addSubscriptionItemSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const subscription = await service.addSubscriptionItem(req.user!.id, id, value, userOrgId, isSuperadmin);
  return responseHandler.created(res, subscription, "Subscription item added successfully");
};

export const removeSubscriptionItemHandler = async (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  const isSuperadmin = isSuperAdminUser(req);
  const userOrgId = req.user!.organizationId;

  const result = await service.removeSubscriptionItem(req.user!.id, id, itemId, userOrgId, isSuperadmin);
  return responseHandler.ok(res, result, "Subscription item removed successfully");
};

// ============================================================================
// PRICING MANAGEMENT CONTROLLERS
// ============================================================================

export const listAllPricesHandler = async (req: Request, res: Response) => {
  const prices = await service.listAllPrices();
  return responseHandler.ok(res, prices, "Catalog prices retrieved successfully");
};

export const createPlanPriceHandler = async (req: Request, res: Response) => {
  const { error, value } = createPlanPriceSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const price = await service.upsertPlanPrice(req.user!.id, value);
  return responseHandler.created(res, price, "Plan price created successfully");
};

export const createAddOnPriceHandler = async (req: Request, res: Response) => {
  const { error, value } = createAddOnPriceSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const price = await service.upsertAddOnPrice(req.user!.id, value);
  return responseHandler.created(res, price, "Add-on price created successfully");
};
