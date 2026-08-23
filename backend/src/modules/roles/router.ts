import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { listRolesHandler, listPermissionsHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/roles", authenticate, requirePermission("platform.roles.view"), catchAsync(listRolesHandler));
router.get("/permissions", authenticate, requirePermission("platform.permissions.view"), catchAsync(listPermissionsHandler));

export default router;
