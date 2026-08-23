import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { grantAccessHandler, revokeAccessHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.post("/", authenticate, requirePermission("platform.access.manage"), catchAsync(grantAccessHandler));
router.delete("/:id", authenticate, requirePermission("platform.access.manage"), catchAsync(revokeAccessHandler));

export default router;
