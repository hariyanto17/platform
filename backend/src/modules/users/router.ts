import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  listUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserHandler,
  updateUserStatusHandler,
} from "./controller";
import { authenticate, requirePermission } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, requirePermission("platform.users.view"), catchAsync(listUsersHandler));
router.get("/:id", authenticate, requirePermission("platform.users.view"), catchAsync(getUserByIdHandler));
router.post("/", authenticate, requirePermission("platform.users.create"), catchAsync(createUserHandler));
router.patch("/:id", authenticate, requirePermission("platform.users.update"), catchAsync(updateUserHandler));
router.patch("/:id/status", authenticate, requirePermission("platform.users.disable"), catchAsync(updateUserStatusHandler));

export default router;
