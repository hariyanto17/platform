import { Request, Response } from "express";
import {
  createChargeValidation,
  midtransWebhookValidation,
} from "./validation";
import * as service from "./service";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";

export const createChargeHandler = async (req: Request, res: Response) => {
  const { error, value } = createChargeValidation.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details.map((d) => d.message).join(", "));
  }

  const output = await service.createCharge(value);
  return responseHandler.created(res, output, "Payment charge initiated successfully");
};

export const midtransWebhookHandler = async (req: Request, res: Response) => {
  const { error, value } = midtransWebhookValidation.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details.map((d) => d.message).join(", "));
  }

  const output = await service.handleMidtransWebhook(value);
  return responseHandler.ok(res, output, output.message);
};

export const getPaymentStatusHandler = async (req: Request, res: Response) => {
  const { identifier } = req.params;
  if (!identifier) throw new AppError("BAD_REQUEST", "identifier is required");

  const output = await service.getPaymentStatus(identifier);
  return responseHandler.ok(res, output, "Payment status retrieved");
};

export const simulatePaymentSuccessHandler = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  if (!orderNumber) throw new AppError("BAD_REQUEST", "orderNumber is required");

  const output = await service.simulatePaymentSuccess(orderNumber);
  return responseHandler.ok(res, output, "Payment simulation executed successfully");
};
