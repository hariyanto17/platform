import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { loginHandler, logoutHandler, getMeHandler, getApplicationContextHandler } from "./controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = Router();

router.post("/login", catchAsync(loginHandler));
router.post("/logout", catchAsync(logoutHandler));
router.get("/me", authenticate, catchAsync(getMeHandler));
router.get("/application-context/:applicationCode", authenticate, catchAsync(getApplicationContextHandler));

export default router;
