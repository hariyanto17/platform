import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";
import * as controller from "./controller";

const router = Router();

// ============================================================================
// ALL SUBSCRIPTION ROUTES REQUIRE AUTHENTICATION
// ============================================================================
router.use(authenticate);

// PRICING MANAGEMENT
router.get("/prices", requirePermission("platform.subscriptions.view"), catchAsync(controller.listAllPricesHandler));
router.post("/prices/plan", requirePermission("platform.subscriptions.manage"), catchAsync(controller.createPlanPriceHandler));
router.post("/prices/addon", requirePermission("platform.subscriptions.manage"), catchAsync(controller.createAddOnPriceHandler));

// SUBSCRIPTION CRUD
router.get("/", requirePermission("platform.subscriptions.view"), catchAsync(controller.listSubscriptionsHandler));
router.get("/:id", requirePermission("platform.subscriptions.view"), catchAsync(controller.getSubscriptionByIdHandler));
router.post("/", requirePermission("platform.subscriptions.manage"), catchAsync(controller.createSubscriptionHandler));
router.patch("/:id", requirePermission("platform.subscriptions.manage"), catchAsync(controller.updateSubscriptionHandler));

// SUBSCRIPTION ITEMS
router.post("/:id/items", requirePermission("platform.subscriptions.manage"), catchAsync(controller.addSubscriptionItemHandler));
router.delete("/:id/items/:itemId", requirePermission("platform.subscriptions.manage"), catchAsync(controller.removeSubscriptionItemHandler));

export default router;
