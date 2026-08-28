import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";
import {
  getEffectiveQuotasHandler,
  getEffectiveQuotaDetailHandler,
  getOrganizationQuotasHandler,
  getUsageHandler,
  recordUsageHandler,
  checkQuotaHandler,
  setTenantQuotaOverrideHandler,
  removeTenantQuotaOverrideHandler,
} from "./controller";

export const quotasRouter = Router();

quotasRouter.use(authenticate);

// Quota queries and evaluations
quotasRouter.get("/", requirePermission("platform.quotas.view"), getEffectiveQuotasHandler);
quotasRouter.post("/check", requirePermission("platform.quotas.view"), checkQuotaHandler);
quotasRouter.get("/usage", requirePermission("platform.quotas.usage.view"), getUsageHandler);
quotasRouter.post("/usage", requirePermission("platform.quotas.usage.manage"), recordUsageHandler);

// Admin tenant specific endpoints
quotasRouter.get(
  "/organizations/:organizationId",
  requirePermission("platform.quotas.view"),
  getOrganizationQuotasHandler
);
quotasRouter.post(
  "/organizations/:organizationId/override",
  requirePermission("platform.quotas.manage"),
  setTenantQuotaOverrideHandler
);
quotasRouter.delete(
  "/organizations/:organizationId/override/:resourceCode",
  requirePermission("platform.quotas.manage"),
  removeTenantQuotaOverrideHandler
);

// Resource specific detail
quotasRouter.get("/:resourceCode", requirePermission("platform.quotas.view"), getEffectiveQuotaDetailHandler);
