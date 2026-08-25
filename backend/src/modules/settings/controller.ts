import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import {
  getSettingsQuerySchema,
  updateSettingPayloadSchema,
  legacyUpdateSettingsSchema,
  validateSettingValue
} from "./validation";
import * as settingsService from "./service";

export const getSettingsHandler = async (req: Request, res: Response) => {
  // If query parameters for search/filtering/pagination are specified
  if (
    req.query.scope !== undefined ||
    req.query.category !== undefined ||
    req.query.search !== undefined ||
    req.query.page !== undefined ||
    req.query.limit !== undefined
  ) {
    const { error, value } = getSettingsQuerySchema.validate(req.query);
    if (error) {
      throw new AppError("BAD_REQUEST", error.details[0].message);
    }

    const result = await settingsService.listSettings({
      category: value.category,
      scope: value.scope,
      scopeId: value.scopeId,
      search: value.search,
      page: value.page || 1,
      limit: value.limit || 20,
    });

    return responseHandler.ok(res, result.settings, "Settings retrieved successfully", result.pagination);
  }

  // Legacy/Default dictionary representation
  const result = await settingsService.listSettings({ page: 1, limit: 100 });
  const map: Record<string, string> = {};
  for (const s of result.settings) {
    map[s.key] = s.value;
  }
  return responseHandler.ok(res, map, "Settings retrieved successfully");
};

export const getSettingDetailHandler = async (req: Request, res: Response) => {
  const orgId = req.query.orgId as string;
  const appCode = req.query.appCode as string;

  const data = await settingsService.getEffectiveSetting(req.params.key, orgId, appCode);
  return responseHandler.ok(res, data, "Effective setting retrieved successfully");
};

export const updateSettingHandler = async (req: Request, res: Response) => {
  const { error, value } = updateSettingPayloadSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const { value: settingValue, scope, scopeId, reason } = value;

  // Validate value boundaries for specific keys
  const validationError = validateSettingValue(req.params.key, settingValue);
  if (validationError) {
    throw new AppError("BAD_REQUEST", validationError);
  }

  const adminUserId = req.user!.id;
  const data = await settingsService.updateSetting({
    adminUserId,
    key: req.params.key,
    value: settingValue,
    scope,
    scopeId,
    reason,
  });

  return responseHandler.ok(res, data, "Setting updated successfully");
};

export const legacyUpdateSettingsHandler = async (req: Request, res: Response) => {
  const { error, value } = legacyUpdateSettingsSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const adminUserId = req.user!.id;
  const data = await settingsService.legacyUpdateSettings(adminUserId, value);

  return responseHandler.ok(res, data, "Settings updated successfully");
};

export const resetSettingHandler = async (req: Request, res: Response) => {
  const scope = req.query.scope as string;
  const scopeId = req.query.scopeId as string;

  if (!scope) {
    throw new AppError("BAD_REQUEST", "scope parameter is required for resetting overrides.");
  }

  const adminUserId = req.user!.id;
  const data = await settingsService.resetSetting({
    adminUserId,
    key: req.params.key,
    scope,
    scopeId: scopeId || "",
  });

  return responseHandler.ok(res, data, "Setting override reset successfully");
};

export const previewSettingHandler = async (req: Request, res: Response) => {
  const scope = req.query.scope as string;
  const scopeId = req.query.scopeId as string;
  const proposedValue = req.query.proposedValue as string;

  if (!scope || proposedValue === undefined) {
    throw new AppError("BAD_REQUEST", "scope and proposedValue are required for previews.");
  }

  const data = await settingsService.previewSetting({
    key: req.params.key,
    proposedValue,
    scope,
    scopeId: scopeId || "",
  });

  return responseHandler.ok(res, data, "Setting override preview generated successfully");
};
