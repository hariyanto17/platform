import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";
import * as controller from "./controller";

const router = Router();

// ============================================================================
// ALL ENTITLEMENT ROUTES REQUIRE AUTHENTICATION
// ============================================================================
router.use(authenticate);

// RESOLUTION ENDPOINTS
router.get("/", requirePermission("platform.entitlements.view"), catchAsync(controller.getEffectiveEntitlementsHandler));
router.get("/organizations/:organizationId", requirePermission("platform.entitlements.view"), catchAsync(controller.getOrganizationEntitlementsHandler));
router.get("/organizations/:organizationId/grants", requirePermission("platform.entitlements.view"), catchAsync(controller.listOrganizationGrantsHandler));

// MANUAL OVERRIDE (CUSTOM GRANTS & REVOCATIONS)
router.post("/organizations/:organizationId/grant", requirePermission("platform.entitlements.manage"), catchAsync(controller.grantCustomEntitlementHandler));
router.post("/organizations/:organizationId/revoke", requirePermission("platform.entitlements.manage"), catchAsync(controller.revokeEntitlementHandler));
router.delete("/organizations/:organizationId/override/:featureKey", requirePermission("platform.entitlements.manage"), catchAsync(controller.removeOverrideHandler));

export default router;
