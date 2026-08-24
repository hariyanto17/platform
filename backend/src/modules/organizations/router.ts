import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { listOrganizationsHandler, getOrganizationByIdHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.organizations.view"), catchAsync(listOrganizationsHandler));
router.get("/:id", authenticate, requirePermission("platform.organizations.view"), catchAsync(getOrganizationByIdHandler));

export default router;
