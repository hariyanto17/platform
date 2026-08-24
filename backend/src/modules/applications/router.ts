import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { listApplicationsHandler, getApplicationByCodeHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.applications.view"), catchAsync(listApplicationsHandler));
router.get("/:code", authenticate, requirePermission("platform.applications.view"), catchAsync(getApplicationByCodeHandler));

export default router;
