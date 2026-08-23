import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { listApplicationsHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.applications.view"), catchAsync(listApplicationsHandler));

export default router;
