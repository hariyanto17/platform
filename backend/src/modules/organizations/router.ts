import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  listOrganizationsHandler,
  getOrganizationByIdHandler,
  createOrganizationHandler,
  updateOrganizationHandler,
  mapApplicationHandler,
  unmapApplicationHandler
} from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.organizations.view"), catchAsync(listOrganizationsHandler));
router.get("/:id", authenticate, requirePermission("platform.organizations.view"), catchAsync(getOrganizationByIdHandler));
router.post("/", authenticate, requirePermission("platform.organizations.manage"), catchAsync(createOrganizationHandler));
router.patch("/:id", authenticate, requirePermission("platform.organizations.manage"), catchAsync(updateOrganizationHandler));

// Mapping Organization <-> Application
router.post("/:id/applications", authenticate, requirePermission("platform.organization_applications.manage"), catchAsync(mapApplicationHandler));
router.delete("/:id/applications/:appCode", authenticate, requirePermission("platform.organization_applications.manage"), catchAsync(unmapApplicationHandler));

export default router;
