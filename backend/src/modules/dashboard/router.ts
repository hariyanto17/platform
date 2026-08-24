import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { getDashboardOverviewHandler } from "./controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = Router();

router.get("/overview", authenticate, catchAsync(getDashboardOverviewHandler));

export default router;
