import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";
import * as controller from "./controller";

const router = Router();

// ============================================================================
// ALL CATALOG ROUTES REQUIRE AUTHENTICATION
// ============================================================================
router.use(authenticate);

// OVERVIEW
router.get("/overview", requirePermission("platform.catalog.view"), catchAsync(controller.getCatalogOverviewHandler));

// MODULES
router.get("/modules", requirePermission("platform.catalog.view"), catchAsync(controller.listModulesHandler));
router.get("/modules/:code", requirePermission("platform.catalog.view"), catchAsync(controller.getModuleByCodeHandler));
router.post("/modules", requirePermission("platform.catalog.manage"), catchAsync(controller.createModuleHandler));
router.patch("/modules/:code", requirePermission("platform.catalog.manage"), catchAsync(controller.updateModuleHandler));

// FEATURES
router.get("/features", requirePermission("platform.catalog.view"), catchAsync(controller.listFeaturesHandler));
router.get("/features/:key", requirePermission("platform.catalog.view"), catchAsync(controller.getFeatureByKeyHandler));
router.post("/features", requirePermission("platform.catalog.manage"), catchAsync(controller.createFeatureHandler));
router.patch("/features/:key", requirePermission("platform.catalog.manage"), catchAsync(controller.updateFeatureHandler));

// DEPENDENCIES
router.post("/dependencies", requirePermission("platform.catalog.manage"), catchAsync(controller.addFeatureDependencyHandler));
router.delete("/dependencies/:featureKey/:dependsOnKey", requirePermission("platform.catalog.manage"), catchAsync(controller.removeFeatureDependencyHandler));

// PLANS
router.get("/plans", requirePermission("platform.catalog.view"), catchAsync(controller.listPlansHandler));
router.get("/plans/:code", requirePermission("platform.catalog.view"), catchAsync(controller.getPlanByCodeHandler));
router.post("/plans", requirePermission("platform.catalog.manage"), catchAsync(controller.createPlanHandler));
router.patch("/plans/:code", requirePermission("platform.catalog.manage"), catchAsync(controller.updatePlanHandler));

// ADD-ONS
router.get("/addons", requirePermission("platform.catalog.view"), catchAsync(controller.listAddOnsHandler));
router.get("/addons/:code", requirePermission("platform.catalog.view"), catchAsync(controller.getAddOnByCodeHandler));
router.post("/addons", requirePermission("platform.catalog.manage"), catchAsync(controller.createAddOnHandler));
router.patch("/addons/:code", requirePermission("platform.catalog.manage"), catchAsync(controller.updateAddOnHandler));

// VERTICALS
router.get("/verticals", requirePermission("platform.catalog.view"), catchAsync(controller.listVerticalsHandler));
router.get("/verticals/:code", requirePermission("platform.catalog.view"), catchAsync(controller.getVerticalByCodeHandler));
router.post("/verticals", requirePermission("platform.catalog.manage"), catchAsync(controller.createVerticalHandler));
router.patch("/verticals/:code", requirePermission("platform.catalog.manage"), catchAsync(controller.updateVerticalHandler));

export default router;
