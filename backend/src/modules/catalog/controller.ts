import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import * as service from "./service";
import {
  createModuleSchema,
  updateModuleSchema,
  createFeatureSchema,
  updateFeatureSchema,
  createDependencySchema,
  createPlanSchema,
  updatePlanSchema,
  createAddOnSchema,
  updateAddOnSchema,
  createVerticalSchema,
  updateVerticalSchema,
} from "./validation";

// ============================================================================
// MODULES CONTROLLER
// ============================================================================

export const listModulesHandler = async (req: Request, res: Response) => {
  const modules = await service.listModules();
  return responseHandler.ok(res, modules, "Modules retrieved successfully");
};

export const getModuleByCodeHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const mod = await service.getModuleByCode(code);
  return responseHandler.ok(res, mod, "Module retrieved successfully");
};

export const createModuleHandler = async (req: Request, res: Response) => {
  const { error, value } = createModuleSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const mod = await service.createModule(req.user!.id, value);
  return responseHandler.created(res, mod, "Module created successfully");
};

export const updateModuleHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const { error, value } = updateModuleSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const mod = await service.updateModule(req.user!.id, code, value);
  return responseHandler.ok(res, mod, "Module updated successfully");
};

// ============================================================================
// FEATURES CONTROLLER
// ============================================================================

export const listFeaturesHandler = async (req: Request, res: Response) => {
  const { moduleCode, status, isCore } = req.query;
  const filter: any = {};
  if (moduleCode) filter.moduleCode = moduleCode.toString();
  if (status) filter.status = status.toString();
  if (isCore !== undefined) filter.isCore = isCore === "true";

  const features = await service.listFeatures(filter);
  return responseHandler.ok(res, features, "Features retrieved successfully");
};

export const getFeatureByKeyHandler = async (req: Request, res: Response) => {
  const { key } = req.params;
  const feature = await service.getFeatureByKey(key);
  return responseHandler.ok(res, feature, "Feature retrieved successfully");
};

export const createFeatureHandler = async (req: Request, res: Response) => {
  const { error, value } = createFeatureSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const feature = await service.createFeature(req.user!.id, value);
  return responseHandler.created(res, feature, "Feature created successfully");
};

export const updateFeatureHandler = async (req: Request, res: Response) => {
  const { key } = req.params;
  const { error, value } = updateFeatureSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const feature = await service.updateFeature(req.user!.id, key, value);
  return responseHandler.ok(res, feature, "Feature updated successfully");
};

// ============================================================================
// DEPENDENCIES CONTROLLER
// ============================================================================

export const addFeatureDependencyHandler = async (req: Request, res: Response) => {
  const { error, value } = createDependencySchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const dep = await service.addFeatureDependency(req.user!.id, value);
  return responseHandler.created(res, dep, "Feature dependency created successfully");
};

export const removeFeatureDependencyHandler = async (req: Request, res: Response) => {
  const { featureKey, dependsOnKey } = req.params;
  const result = await service.removeFeatureDependency(req.user!.id, featureKey, dependsOnKey);
  return responseHandler.ok(res, result, "Feature dependency removed successfully");
};

// ============================================================================
// PLANS CONTROLLER
// ============================================================================

export const listPlansHandler = async (req: Request, res: Response) => {
  const plans = await service.listPlans();
  return responseHandler.ok(res, plans, "Plans retrieved successfully");
};

export const getPlanByCodeHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const plan = await service.getPlanByCode(code);
  return responseHandler.ok(res, plan, "Plan retrieved successfully");
};

export const createPlanHandler = async (req: Request, res: Response) => {
  const { error, value } = createPlanSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const plan = await service.createPlan(req.user!.id, value);
  return responseHandler.created(res, plan, "Plan created successfully");
};

export const updatePlanHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const { error, value } = updatePlanSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const plan = await service.updatePlan(req.user!.id, code, value);
  return responseHandler.ok(res, plan, "Plan updated successfully");
};

// ============================================================================
// ADD-ONS CONTROLLER
// ============================================================================

export const listAddOnsHandler = async (req: Request, res: Response) => {
  const addOns = await service.listAddOns();
  return responseHandler.ok(res, addOns, "Add-ons retrieved successfully");
};

export const getAddOnByCodeHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const addOn = await service.getAddOnByCode(code);
  return responseHandler.ok(res, addOn, "Add-on retrieved successfully");
};

export const createAddOnHandler = async (req: Request, res: Response) => {
  const { error, value } = createAddOnSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const addOn = await service.createAddOn(req.user!.id, value);
  return responseHandler.created(res, addOn, "Add-on created successfully");
};

export const updateAddOnHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const { error, value } = updateAddOnSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const addOn = await service.updateAddOn(req.user!.id, code, value);
  return responseHandler.ok(res, addOn, "Add-on updated successfully");
};

// ============================================================================
// VERTICALS CONTROLLER
// ============================================================================

export const listVerticalsHandler = async (req: Request, res: Response) => {
  const verticals = await service.listVerticals();
  return responseHandler.ok(res, verticals, "Verticals retrieved successfully");
};

export const getVerticalByCodeHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const vertical = await service.getVerticalByCode(code);
  return responseHandler.ok(res, vertical, "Vertical retrieved successfully");
};

export const createVerticalHandler = async (req: Request, res: Response) => {
  const { error, value } = createVerticalSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const vertical = await service.createVertical(req.user!.id, value);
  return responseHandler.created(res, vertical, "Vertical created successfully");
};

export const updateVerticalHandler = async (req: Request, res: Response) => {
  const { code } = req.params;
  const { error, value } = updateVerticalSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }
  const vertical = await service.updateVertical(req.user!.id, code, value);
  return responseHandler.ok(res, vertical, "Vertical updated successfully");
};

// ============================================================================
// OVERVIEW CONTROLLER
// ============================================================================

export const getCatalogOverviewHandler = async (req: Request, res: Response) => {
  const overview = await service.getCatalogOverview();
  return responseHandler.ok(res, overview, "Catalog overview retrieved successfully");
};
