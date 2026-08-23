import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { listOrganizationsHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.organizations.view"), catchAsync(listOrganizationsHandler));

export default router;
