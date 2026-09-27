import Joi from "joi";

export interface CreateChargeInput {
  appCode: "TICKETING" | "CONCESSION" | "PARKING" | "COMBO";
  externalOrderId: string;
  orderNumber: string;
  grossAmount: number;
  paymentType?: "qris" | "snap" | "gopay" | "bank_transfer";
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  splitItems?: Array<{
    targetAppCode: "TICKETING" | "CONCESSION" | "PARKING";
    targetOrderId: string;
    amount: number;
  }>;
  expiryMinutes?: number;
  metadata?: Record<string, any>;
}

export const createChargeValidation = Joi.object({
  appCode: Joi.string().valid("TICKETING", "CONCESSION", "PARKING", "COMBO").required(),
  externalOrderId: Joi.string().required(),
  orderNumber: Joi.string().required(),
  grossAmount: Joi.number().positive().required(),
  paymentType: Joi.string().valid("qris", "snap", "gopay", "bank_transfer").default("qris"),
  customer: Joi.object({
    name: Joi.string().allow("", null).optional(),
    email: Joi.string().email().allow("", null).optional(),
    phone: Joi.string().allow("", null).optional(),
  }).optional(),
  itemDetails: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        price: Joi.number().required(),
        quantity: Joi.number().integer().positive().required(),
        name: Joi.string().required(),
      })
    )
    .optional(),
  splitItems: Joi.array()
    .items(
      Joi.object({
        targetAppCode: Joi.string().valid("TICKETING", "CONCESSION", "PARKING").required(),
        targetOrderId: Joi.string().required(),
        amount: Joi.number().positive().required(),
      })
    )
    .optional(),
  expiryMinutes: Joi.number().integer().min(1).max(120).default(10),
  metadata: Joi.object().optional(),
});

export interface MidtransWebhookPayload {
  transaction_time?: string;
  transaction_status: string;
  transaction_id: string;
  status_message?: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  gross_amount: string;
  fraud_status?: string;
  settlement_time?: string;
  currency?: string;
  [key: string]: any;
}

export const midtransWebhookValidation = Joi.object({
  transaction_status: Joi.string().required(),
  transaction_id: Joi.string().required(),
  status_code: Joi.string().required(),
  signature_key: Joi.string().required(),
  payment_type: Joi.string().required(),
  order_id: Joi.string().required(),
  gross_amount: Joi.string().required(),
  transaction_time: Joi.string().optional(),
  status_message: Joi.string().optional(),
  fraud_status: Joi.string().optional(),
  settlement_time: Joi.string().optional(),
  currency: Joi.string().optional(),
}).unknown(true);

export interface DispatchNotificationPayload {
  masterTransactionNumber: string;
  externalOrderId: string;
  targetAppCode: string;
  targetOrderId: string;
  status: "SETTLEMENT" | "PENDING" | "CANCELLED" | "EXPIRED" | "FAILED";
  provider: "MIDTRANS";
  paymentType: string;
  providerTransactionId: string;
  grossAmount: number;
  settledAt?: string;
  rawPayload: any;
}
