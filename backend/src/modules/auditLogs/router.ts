import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { listAuditLogsHandler } from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.audit_logs.view"), catchAsync(listAuditLogsHandler));

export default router;
