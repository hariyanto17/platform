import { Router, Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { AppError } from "../../utils/errorHandler";
import crypto from "crypto";
import * as controller from "./controller";
import { PLATFORM_INTERNAL_API_KEY } from "../../config/midtrans";

const router = Router();

const authenticateInternalService = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-platform-internal-key"]?.toString();
  const expectedKey = PLATFORM_INTERNAL_API_KEY;

  let isMatch = false;
  if (apiKey) {
    const aBuf = Buffer.from(apiKey);
    const bBuf = Buffer.from(expectedKey);
    if (aBuf.length === bBuf.length) {
      isMatch = crypto.timingSafeEqual(aBuf, bBuf);
    }
  }

  if (!isMatch) {
    return next(new AppError("UNAUTHORIZED", "Invalid or missing internal service credential"));
  }

  next();
};

// 1. Midtrans Webhook Notification Endpoint (Public, Signature-Verified)
router.post(
  "/midtrans/webhook",
  catchAsync(controller.midtransWebhookHandler)
);

// Alternative webhook route for standard Midtrans callback URL conventions
router.post(
  "/midtrans/notification",
  catchAsync(controller.midtransWebhookHandler)
);

// 2. Internal Microservice Payment Charge Creation
router.post(
  "/charge",
  authenticateInternalService,
  catchAsync(controller.createChargeHandler)
);

// 3. Payment Status Check
router.get(
  "/status/:identifier",
  catchAsync(controller.getPaymentStatusHandler)
);

// 4. Sandbox Payment Simulation (Internal)
router.post(
  "/simulate/:orderNumber",
  authenticateInternalService,
  catchAsync(controller.simulatePaymentSuccessHandler)
);

export default router;
